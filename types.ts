export interface Source {
  title: string;
  uri: string;
}

export enum LayerType {
  CLAIM = 'claim',
  INVESTIGATION = 'investigation',
  VERDICT = 'verdict',
  REASONING = 'reasoning',
  BIAS = 'bias',
  CITATIONS = 'citations'
}

export interface BiasData {
  politicalScore: number;
  scientificDeviation: number;
  emotionalCharge: number;
  commercialInterest: number;
  framingNotes?: string;
}


export interface DebateTurn {
  speaker: 'Pro' | 'Con';
  text: string;
}

export interface StackLayerData {
  id: string;
  type: LayerType;
  title: string;
  content: string;
  isLoading: boolean;
  biasData?: BiasData; // Optional bias metrics
  debate?: DebateTurn[]; // Optional live debate transcript
}

export interface AnalysisResult {
  layers: StackLayerData[];
  sources: Source[];
  suggestedQuestions?: string[];
  confidenceScore?: number;
  keyReasons?: string[];
  whatWouldChange?: string;
}
