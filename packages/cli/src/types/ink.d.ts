// Fix for React 19 / Ink type compatibility
import type { FC, ReactNode } from 'react';

declare module 'ink' {
  export interface BoxProps {
    children?: ReactNode;
  }

  export interface TextProps {
    children?: ReactNode;
  }
}
