import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Button } from './ui/button';

type ConfirmActionDialogVariant = 'default' | 'danger';

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmActionDialogVariant;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

const getConfirmButtonClassName = (variant: ConfirmActionDialogVariant) => {
  if (variant === 'danger') {
    return 'cursor-pointer disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 dark:bg-[#273447] dark:text-[#e7a0a9] dark:hover:bg-[#314155]';
  }

  return 'cursor-pointer disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 dark:bg-[#273447] dark:text-[#8bd8b1] dark:hover:bg-[#314155]';
};

export default function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'default',
  isLoading = false,
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  const isDanger = variant === 'danger';
  const [descriptionTitle, ...descriptionRest] = description.split('\n');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`${isDanger ? 'min-h-[280px]' : ''} dark:border-[#2f394a] dark:bg-[#1f2a37] dark:text-slate-100`}>
        <AlertDialogHeader className={isDanger ? 'space-y-3' : undefined}>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {isDanger ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-5 text-center dark:border-[#2f394a] dark:bg-[#273447]">
              <AlertDialogDescription className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                <span className="mb-2 block font-bold text-red-600 dark:text-[#e7a0a9]">ATENÇÃO:</span>
                <span className="block font-semibold text-gray-800 dark:text-slate-100">{descriptionTitle}</span>
                {descriptionRest.length > 0 && (
                  <span className="mt-2 block">{descriptionRest.join('\n')}</span>
                )}
              </AlertDialogDescription>
            </div>
          ) : (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className={isDanger ? 'mt-6' : undefined}>
          <AlertDialogCancel disabled={isLoading} className="cursor-pointer dark:border-[#3b4658] dark:bg-[#273447] dark:text-slate-200 dark:hover:bg-[#314155]">
            {cancelLabel}
          </AlertDialogCancel>
          <Button type="button" disabled={isLoading} onClick={onConfirm} className={getConfirmButtonClassName(variant)}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
