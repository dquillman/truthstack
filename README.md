# TruthStack

TruthStack is a layered analysis engine designed to decompose complex claims into evidence, bias, and a final verdict. It uses Google Gemini 2.0 and live search to provide a multi-layered verification experience.

## How to Run

1. **Install Dependencies**:

    ```bash
    npm install
    ```

2. **Set Up Environment**:
    Create a `.env.local` file and add your Google Gemini (Vertex AI) configuration:

    ```
    VITE_FIREBASE_API_KEY=your_api_key
    ...
    ```

3. **Start Development Server**:

    ```bash
    npm run dev
    ```

4. **Build for Production**:

    ```bash
    npm run build
    ```

## What Changed (v1.2.0)

- **Redesigned Landing Screen**: A focused, primary input with 6 auto-fill example chips and a value-prop preview.
- **Layered Truth Results**: Results are now presented in an accordion layout:
  - **Layer 1: The Claim**: Normalized claim and underlying assumptions.
  - **Layer 2: Investigation**: Deep dive evidence with bias metrics and framing notes.
  - **Layer 3: Verdict**: Final determination with confidence scoring and key reasons.
  - **Citations**: Clean, copyable list of verified sources.
- **Analysis History**: Last 10 analyses are stored locally for quick access.
- **Guardrails**:
  - Zero-source cases now correctly force an "UNVERIFIED" status with low confidence (<= 0.35).
  - Citations or inference labels are required for factual statements.
- **Improved UX**: Granular loading states ("Searching sources...", etc.) and friendly error handling for missing API keys.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Vanilla CSS + Tailwind
- **AI**: Google Gemini (Vertex AI)
- **Icons**: Lucide React
