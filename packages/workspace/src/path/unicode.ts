/** Internal UTF-16 validity helper shared by workspace path and URI codecs. */
export function hasUnpairedSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        return true;
      }
      index += 1;
    }
  }

  return false;
}
