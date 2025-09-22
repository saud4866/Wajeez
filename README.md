
## Wajeez Meeting Intelligence Platform 

Wajeez is a powerful service designed to transform unstructured audio from meetings into structured, actionable intelligence. The platform automates the tedious process of note-taking, task tracking, and analysis, allowing teams to focus on what truly matters: collaboration and decision-making.

## Problem 

Meetings are essential for collaboration, but they often come with significant overhead. Key information can be lost, action items forgotten, and valuable insights buried in hours of conversation. This leads to:

- Information Overload: Participants struggle to recall key decisions and discussions accurately.

- Manual Drudgery: Manually transcribing audio, writing summaries, and identifying tasks is time-consuming and prone to error.

- Lost Action Items: Without a systematic process, crucial tasks assigned during a meeting can fall through the cracks.

- Ineffective Follow-up: Teams lack the structured data needed to review meeting effectiveness and improve future sessions.

Wajeez tackles these problems head-on by providing an automated, intelligent system that processes meeting audio and delivers comprehensive, organized, and searchable results.

## Key Features

- Accurate Audio Transcription
- Comprehensive AI Analysis
- Executive Summaries
- Task Extraction
- Improvement Recommendations
- Fact-Checking & Data Point Identification
- Chatbot w/ RAG
- Meeting History


## Implementation

This pipeline takes audio input from different sources (meetings, calls, or customer interactions), applies noise reduction, and transcribes it. The transcription is then processed by a large language model (LLM) for deeper analysis. The analysis module generates detailed reports, evaluates meeting topics, and counts participants. Finally, the results are presented in a web-based user interface for easy review and interaction.

  <img width="1600" height="1427" alt="Web UI" src="https://github.com/user-attachments/assets/4c608572-444b-4d22-8cae-58e4eb53310a" />


  ## In-house dataset

  For future work, we introduce a 100-hour Automatic Speech Recognition (ASR) dataset for the Saudi dialect. The dataset comprises high-quality audio recordings aligned with precise transcriptions, collected from a diverse pool of speakers balanced across gender, age, and regional backgrounds within Saudi Arabia. It captures naturally occurring conversational speech, spanning everyday topics, spontaneous dialogues, and a variety of regional accents, thereby reflecting the linguistic and dialectal richness of Saudi Arabic. This resource is intended to facilitate the training and evaluation of ASR systems, with the goal of advancing dialect-specific recognition performance.
  <img width="1430" height="586" alt="image" src="https://github.com/user-attachments/assets/39b9669e-3def-4bd9-bfae-1dd8ee3d22f0" />


## Website

### Uploading or recording meetings

Users can either upload a pre-recorded meeting audio file or start recording instantly by clicking the **Record Live** button
<img width="2444" height="1183" alt="image" src="https://github.com/user-attachments/assets/c453d6cf-0719-4050-948a-0784691311c8" />


### Analysis of a meeting

![image]([https://github.com/saud4866/Wajeez/blob/main/firefox_QeKgjbFdLP.gif?raw=true)


