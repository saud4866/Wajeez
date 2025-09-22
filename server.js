const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store meeting data for RAG
const meetingDatabase = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/flac'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Main endpoint for processing audio
app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const filePath = req.file.path;
    const fileSizeMB = req.file.size / (1024 * 1024);
    const meetingId = Date.now().toString();
    
    console.log(`Processing audio file: ${req.file.originalname} (${fileSizeMB.toFixed(2)}MB)`);
    
    // Step 1: Transcribe with Gemini
    console.log('Transcribing audio with Gemini...');
    const transcription = await transcribeWithGemini(filePath);
    
    if (!transcription) {
      throw new Error('Failed to transcribe audio');
    }

    // Step 2: Generate comprehensive analysis
    console.log('Generating comprehensive meeting analysis...');
    
    // Add delay function to respect rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Generate analyses sequentially with delays to avoid rate limits
    console.log('1/4 Generating summary...');
    const summary = await generateMeetingSummary(transcription);
    await delay(1000); // 1 second delay between requests
    
    console.log('2/4 Extracting tasks...');
    const tasks = await extractTasks(transcription);
    await delay(1000);
    
    console.log('3/4 Generating improvements...');
    const improvements = await generateImprovements(transcription);
    await delay(1000);
    
    console.log('4/4 Performing fact check...');
    const factCheck = await factCheckTranscription(transcription);
    
    console.log('Analysis complete!');
    
    // Store meeting data for RAG
    const meetingData = {
      id: meetingId,
      filename: req.file.originalname,
      timestamp: new Date().toISOString(),
      transcription,
      summary,
      tasks,
      improvements,
      factCheck
    };
    
    meetingDatabase.set(meetingId, meetingData);
    
    // Clean up uploaded file
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
    }
    
    res.json({
      success: true,
      meetingId,
      transcription,
      summary,
      tasks,
      improvements,
      factCheck,
      filename: req.file.originalname,
      filesize: req.file.size,
      timestamp: meetingData.timestamp
    });
    
  } catch (error) {
    console.error('Error processing audio:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      error: 'Failed to process audio file',
      details: error.message 
    });
  }
});

// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
  try {
    const { message, meetingId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }
    
    let context = '';
    if (meetingId && meetingDatabase.has(meetingId)) {
      const meeting = meetingDatabase.get(meetingId);
      context = `
        Context from the meeting:
        Transcription: ${meeting.transcription}
        Summary: ${meeting.summary}
        Tasks: ${meeting.tasks}
        
        Based on this meeting context, please answer the following question:
      `;
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = context + message + "\n\nIMPORTANT: Respond in ENGLISH only.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({
      success: true,
      response: response.text()
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Function to transcribe audio using Gemini
async function transcribeWithGemini(filePath) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const audioData = await fs.readFile(filePath);
    const base64Audio = audioData.toString('base64');
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.mp4': 'audio/mp4'
    };
    const mimeType = mimeTypes[ext] || 'audio/mpeg';
    
    const prompt = `Please transcribe this audio file accurately. Include speaker labels if multiple speakers are detected (e.g., Speaker 1:, Speaker 2:). Provide only the transcription without any additional commentary. If the audio is in Arabic or any other language, transcribe it in its original language.`;
    
    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType
      }
    };
    
    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error('Gemini transcription error:', error);
    throw new Error('Failed to transcribe audio with Gemini: ' + error.message);
  }
}

// Generate meeting summary
async function generateMeetingSummary(transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const prompt = `
      Analyze this meeting transcription and provide a comprehensive summary in JSON format.
      
      IMPORTANT: ALL OUTPUT MUST BE IN ENGLISH ONLY.
      
      Return a valid JSON object with the following structure:
      {
        "overview": "2-3 sentence overview of the meeting",
        "duration": "estimated duration if mentioned",
        "participants": ["List of participants if identifiable"],
        "keyPoints": [
          {
            "title": "Main topic discussed",
            "description": "Brief description of the topic",
            "importance": "high/medium/low"
          }
        ],
        "decisions": [
          {
            "decision": "Decision that was made",
            "rationale": "Why this decision was made",
            "responsible": "Who is responsible"
          }
        ],
        "insights": [
          "Important insight or information that emerged"
        ],
        "outcomes": [
          "Concrete outcome or result from the meeting"
        ],
        "nextSteps": [
          "What happens next after this meeting"
        ]
      }
      
      Transcription:
      "${transcription}"
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse as JSON, if fails return structured error
    try {
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (e) {
      return {
        overview: "Failed to parse summary",
        keyPoints: [],
        decisions: [],
        insights: [],
        outcomes: [],
        nextSteps: []
      };
    }
  } catch (error) {
    console.error('Summary generation error:', error.message);
    return {
      error: "Failed to generate summary",
      message: error.message
    };
  }
}

// Extract tasks from meeting
async function extractTasks(transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const prompt = `
      Analyze this meeting transcription and extract all tasks and action items.
      
      IMPORTANT: ALL OUTPUT MUST BE IN ENGLISH ONLY.
      
      Return a valid JSON object with the following structure:
      {
        "tasks": [
          {
            "id": 1,
            "task": "Clear description of what needs to be done",
            "assignedTo": "Person responsible or 'Unassigned'",
            "deadline": "Deadline if mentioned or 'Not specified'",
            "priority": "high/medium/low",
            "status": "pending",
            "context": "Brief context about why this task was assigned",
            "dependencies": ["List any dependencies if mentioned"]
          }
        ],
        "followUpItems": [
          "Items that need follow-up but aren't specific tasks"
        ],
        "totalTasks": 0,
        "highPriorityCount": 0,
        "assignedCount": 0,
        "unassignedCount": 0
      }
      
      If no tasks were identified, return an object with empty arrays.
      
      Transcription:
      "${transcription}"
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const data = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      // Calculate counts
      data.totalTasks = data.tasks.length;
      data.highPriorityCount = data.tasks.filter(t => t.priority === 'high').length;
      data.assignedCount = data.tasks.filter(t => t.assignedTo !== 'Unassigned').length;
      data.unassignedCount = data.tasks.filter(t => t.assignedTo === 'Unassigned').length;
      return data;
    } catch (e) {
      return {
        tasks: [],
        followUpItems: [],
        totalTasks: 0,
        highPriorityCount: 0,
        assignedCount: 0,
        unassignedCount: 0
      };
    }
  } catch (error) {
    console.error('Task extraction error:', error.message);
    return {
      error: "Failed to extract tasks",
      tasks: [],
      followUpItems: []
    };
  }
}

// Generate meeting improvements
async function generateImprovements(transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const prompt = `
      Analyze this meeting transcription and provide recommendations for improvement.
      
      IMPORTANT: ALL OUTPUT MUST BE IN ENGLISH ONLY.
      
      Return a valid JSON object with the following structure:
      {
        "effectivenessScore": 7,
        "scoreRationale": "Explanation for the score",
        "strengths": [
          {
            "area": "What went well",
            "description": "Why it was good"
          }
        ],
        "improvements": {
          "structure": [
            "How could the meeting structure be improved"
          ],
          "communication": [
            "How could communication be clearer"
          ],
          "participation": [
            "How to improve engagement and participation"
          ],
          "timeManagement": [
            "How to better manage time"
          ],
          "decisionMaking": [
            "How to make decisions more efficiently"
          ]
        },
        "recommendations": [
          {
            "priority": "high/medium/low",
            "recommendation": "Specific actionable recommendation",
            "impact": "Expected impact of implementing this"
          }
        ],
        "bestPractices": [
          "Best practice to adopt for future meetings"
        ]
      }
      
      Transcription:
      "${transcription}"
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (e) {
      return {
        effectivenessScore: 0,
        scoreRationale: "Unable to analyze",
        strengths: [],
        improvements: {},
        recommendations: [],
        bestPractices: []
      };
    }
  } catch (error) {
    console.error('Improvement generation error:', error.message);
    return {
      error: "Failed to generate improvements",
      message: error.message
    };
  }
}

// Fact-check transcription
async function factCheckTranscription(transcription) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const prompt = `
      Analyze this meeting transcription for potential errors, inconsistencies, or claims that need fact-checking.
      
      IMPORTANT: ALL OUTPUT MUST BE IN ENGLISH ONLY.
      
      Return a valid JSON object with the following structure:
      {
        "transcriptionQuality": {
          "rating": "excellent/good/fair/poor",
          "score": 85,
          "issues": [
            "List any quality issues found"
          ]
        },
        "potentialErrors": [
          {
            "text": "The questionable text",
            "suggestion": "What it might actually be",
            "confidence": "high/medium/low",
            "type": "spelling/grammar/context"
          }
        ],
        "factualClaims": [
          {
            "claim": "What was stated",
            "speaker": "Who said it if identifiable",
            "verificationStatus": "verified/unverified/incorrect",
            "correctInformation": "Correct info if claim is incorrect",
            "source": "Source of verification if available"
          }
        ],
        "inconsistencies": [
          {
            "issue": "Description of the inconsistency",
            "location": "Where in the discussion",
            "severity": "high/medium/low"
          }
        ],
        "dataPoints": [
          {
            "type": "number/date/statistic",
            "value": "The data mentioned",
            "context": "Context of the data",
            "verification": "verified/unverified/questionable"
          }
        ],
        "technicalTerms": [
          {
            "term": "Technical term used",
            "usage": "How it was used",
            "correct": true,
            "definition": "Brief definition"
          }
        ],
        "recommendations": [
          "Recommendation for verifying uncertain information"
        ]
      }
      
      Transcription:
      "${transcription}"
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
    } catch (e) {
      return {
        transcriptionQuality: { rating: "unknown", score: 0, issues: [] },
        potentialErrors: [],
        factualClaims: [],
        inconsistencies: [],
        dataPoints: [],
        technicalTerms: [],
        recommendations: []
      };
    }
  } catch (error) {
    console.error('Fact-check error:', error.message);
    return {
      error: "Failed to perform fact-check",
      message: error.message
    };
  }
}

// Get meeting history
app.get('/api/meetings', (req, res) => {
  const meetings = Array.from(meetingDatabase.values()).map(m => ({
    id: m.id,
    filename: m.filename,
    timestamp: m.timestamp,
    summary: m.summary.substring(0, 200) + '...'
  }));
  
  res.json({
    success: true,
    meetings: meetings.reverse() // Most recent first
  });
});

// Get specific meeting
app.get('/api/meeting/:id', (req, res) => {
  const meeting = meetingDatabase.get(req.params.id);
  
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  
  res.json({
    success: true,
    meeting
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    gemini_configured: !!process.env.GEMINI_API_KEY,
    version: '3.0',
    features: ['transcription', 'summary', 'tasks', 'improvements', 'fact-check', 'chat', 'live-recording']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Wajeez Meeting Intelligence Platform`);
  console.log(`✨ Server running on http://localhost:${PORT}`);
  console.log('📊 Features: Transcription, Analysis, Chat, Live Recording');
  console.log('🤖 Using Gemini model: gemini-2.5-pro');
  console.log('🔑 Make sure to set GEMINI_API_KEY in .env file');
});