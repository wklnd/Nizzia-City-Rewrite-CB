function randomNumber(min, max, float) {
  if (float) {
    return Math.random() * (max - min) + min;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

