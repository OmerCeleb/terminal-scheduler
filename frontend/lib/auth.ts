export function setToken(token: string) {
  localStorage.setItem('token', token)
  document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 8}`
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function removeToken() {
  localStorage.removeItem('token')
  document.cookie = 'token=; path=/; max-age=0'
}
