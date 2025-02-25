import { createContext } from 'react';
import type { ButtonProps } from '@/components/ui/button';

export const ButtonContext = createContext<ButtonProps>({} as ButtonProps); 