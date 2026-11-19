const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function api(path, { method = 'GET', body, headers, signal } = {}) {
  const init = {
    method,
    headers: body === undefined ? headers : { ...JSON_HEADERS, ...headers },
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(path, init);
  } catch (cause) {
    const error = new Error('Нет связи с сервером');
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    let message = `Ошибка ${response.status}`;

    try {
      const payload = await response.json();
      if (payload && payload.error) {
        message = payload.error;
      }
    } catch {
      // тело не JSON — оставляем сообщение по статусу
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
