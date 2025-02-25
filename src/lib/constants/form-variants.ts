import { cva } from 'class-variance-authority';

export const formLabelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

export const formItemVariants = cva(
  'space-y-2'
);

export const formControlVariants = cva(
  'flex w-full flex-col gap-2'
);

export const formMessageVariants = cva(
  'text-sm font-medium text-destructive'
);

export const formDescriptionVariants = cva(
  'text-sm text-muted-foreground'
); 