import { createContext } from 'react';
import type { FieldValues, FieldPath } from 'react-hook-form';

export interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
}

export interface FormItemContextValue {
  id: string;
}

export const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);
export const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue); 