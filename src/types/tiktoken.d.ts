declare module '@dqbd/tiktoken' {
  export function encoding_for_model(model: string): {
    encode: (text: string) => number[];
    decode: (tokens: number[]) => string;
    free: () => void;
  };
} 