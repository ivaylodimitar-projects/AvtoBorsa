import { useEffect, useRef, useCallback } from 'react';

interface LazyImage {
  id: number;
  image: string;
  loaded?: boolean;
}

/**
 * Hook to manage lazy loading of images
 * Only loads the current, previous, and next images
 */
export const useGalleryLazyLoad = (
  images: LazyImage[],
  currentIndex: number,
  getImageUrl: (path: string) => string
) => {
  const loadedImagesRef = useRef<Set<number>>(new Set());

  // Preload images: current, previous, and next
  useEffect(() => {
    const indicesToLoad = [
      currentIndex,
      (currentIndex - 1 + images.length) % images.length,
      (currentIndex + 1) % images.length,
    ];

    indicesToLoad.forEach((idx) => {
      if (!loadedImagesRef.current.has(idx)) {
        const img = new Image();
        img.src = getImageUrl(images[idx].image);
        img.onload = () => {
          loadedImagesRef.current.add(idx);
        };
      }
    });
  }, [currentIndex, images, getImageUrl]);

  const getLoadedImages = useCallback(() => {
    return Array.from(loadedImagesRef.current);
  }, []);

  const isImageLoaded = useCallback((index: number) => {
    return loadedImagesRef.current.has(index);
  }, []);

  return { getLoadedImages, isImageLoaded };
};

/**
 * Hook to get the image URL with proper backend handling
 */
export const useImageUrl = () => {
  return useCallback((imagePath: string) => {
    if (!imagePath) {
      return '';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    if (imagePath.startsWith('/')) {
      return `http://localhost:8000${imagePath}`;
    }
    if (imagePath.startsWith('media/')) {
      return `http://localhost:8000/${imagePath}`;
    }
    return `http://localhost:8000/media/${imagePath}`;
  }, []);
};

/**
 * Hook to manage image preloading for smooth transitions
 */
export const useImagePreloader = () => {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(
    async (srcs: string[]): Promise<void> => {
      try {
        await Promise.all(srcs.map(preloadImage));
      } catch (error) {
        console.warn('Error preloading images:', error);
      }
    },
    [preloadImage]
  );

  return { preloadImage, preloadImages };
};
