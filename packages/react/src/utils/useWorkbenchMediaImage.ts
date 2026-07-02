import { useCallback, useEffect, useState } from 'react';

export function hasWorkbenchMediaImageSource(
  imageUrl: string | null | undefined,
): imageUrl is string {
  return imageUrl !== null && imageUrl !== undefined && imageUrl.trim() !== '';
}

export interface UseWorkbenchMediaImageResult {
  readonly hasSource: boolean;
  readonly imageSrc: string | undefined;
  readonly onImageError: () => void;
  readonly shouldShowImage: boolean;
}

export function useWorkbenchMediaImage(
  imageUrl: string | null | undefined,
): UseWorkbenchMediaImageResult {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const onImageError = useCallback(() => {
    setFailed(true);
  }, []);

  const hasSource = hasWorkbenchMediaImageSource(imageUrl);

  return {
    hasSource,
    imageSrc: hasSource ? imageUrl : undefined,
    onImageError,
    shouldShowImage: hasSource && !failed,
  };
}
