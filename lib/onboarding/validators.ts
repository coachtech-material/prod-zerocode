export function validatePassword(value: string, label = 'パスワード') {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}を入力してください`);
  }
  if (trimmed.length < 8) {
    throw new Error('パスワードは8文字以上で入力してください');
  }
  if (trimmed.length > 72) {
    throw new Error('パスワードが長すぎます');
  }
  return trimmed;
}
