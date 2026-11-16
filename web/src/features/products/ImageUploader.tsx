import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/cn';
import { productsApi } from './products.api';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

interface ImageUploaderProps {
  imageUrl: string | null;
  onChange: (value: { key: string; url: string } | null) => void;
  disabled?: boolean;
}

/** Upload com arrastar-e-soltar, pré-visualização e validação no cliente (a API revalida). */
export function ImageUploader({ imageUrl, onChange, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Formato não suportado. Envie JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('A imagem deve ter no máximo 2 MB.');
      return;
    }
    setUploading(true);
    try {
      onChange(await productsApi.uploadImage(file));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void handleFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-ink-50',
          imageUrl && 'border-solid border-ink-200',
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Pré-visualização do produto" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-ink-300" aria-hidden />
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-sm">
            <LoaderCircle className="size-6 animate-spin text-brand-600" aria-label="Enviando imagem" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-medium text-ink-800 shadow-xs ring-1 ring-ink-200 ring-inset hover:bg-ink-50 disabled:opacity-50"
          >
            <Upload className="size-4" aria-hidden />
            {imageUrl ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || uploading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Remover
            </button>
          )}
        </div>
        <p className="text-xs text-ink-500">JPG, PNG ou WEBP até 2 MB. Arraste a imagem ou clique para enviar.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label="Selecionar imagem do produto"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
