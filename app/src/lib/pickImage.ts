// pickImage — cross-platform image source.
// On web: uses a hidden <input type="file"> element. capture='environment'
// makes mobile browsers open the rear camera directly.
// On native: caller can use expo-image-picker / expo-camera instead.

import { Platform } from 'react-native';

export type PickSource = 'camera' | 'gallery' | 'any';

export async function pickImageWeb(source: PickSource): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // 'camera' forces the rear camera. 'any' lets the OS show its native
    // picker (which usually offers BOTH "Take Photo" and "Choose from Library").
    if (source === 'camera') {
      input.setAttribute('capture', 'environment');
    }
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) return resolve(null);
      // Object URL for instant preview; we'll fetch() it later to get bytes.
      resolve(URL.createObjectURL(file));
    };

    // If user cancels there's no event in some browsers — give a hint via focus.
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      // small delay so the change event fires first if the user did pick a file
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
          resolve(null);
        }
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}
