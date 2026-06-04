/**
 * @typedef {Object} Z8Message
 * @property {string} [text]
 * @property {string} [type]
 * @property {string} [source]
 * @property {string} [time]
 */

/**
 * @callback Z8MessagesHandler
 * @param {Z8Message[]} messages
 */

/**
 * @typedef {Object} Z8HttpOptions
 * @property {string} [url]
 * @property {string|null} [session]
 * @property {typeof fetch} [fetchImpl]
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8CallOptions
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8Period
 * @property {string|null} [start]
 * @property {string|null} [finish]
 */

/**
 * @typedef {Object} Z8ReadOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string} [query] - Ключ предопределённого query внутри регистра.
 * @property {string[]} [fields] - Имена колонок для ответа.
 * @property {object[]} [quickFilter] - Быстрые фильтры UI.
 * @property {object[]} [filter] - Условия фильтрации записей.
 * @property {object[]} [where] - Дополнительные условия отбора.
 * @property {object[]} [sort] - Порядок сортировки.
 * @property {object} [values] - Параметры запроса (подстановки для query и т.п.).
 * @property {Z8Period} [period] - Период отбора по датам.
 * @property {number} [start=0] - Смещение постраничного чтения.
 * @property {number} [limit=200] - Максимум записей в ответе.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8DestroyOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string[]} [ids] - Идентификаторы записей для удаления.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8WriteOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {object[]} [data] - Записи для создания или обновления.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8ActionOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string} name - Имя action на сервере.
 * @property {object[]} [records] - Записи для action.
 * @property {object[]} [parameters] - Параметры action.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8JobOptions
 * @property {string} request - Класс/имя серверной задачи Z8 (обязательный).
 * @property {Z8Period} [period] - Период отбора по датам.
 * @property {number} [pollIntervalMs=1000] - Пауза между запросами опроса статуса задачи.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8AttachOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string} recordId - Идентификатор записи.
 * @property {string} field - Имя поля вложения.
 * @property {Object} [details] - JSON-объект метаданных вложения (по умолчанию `{}`).
 * @property {Blob|File} file - Файл для загрузки.
 * @property {string} [fileName] - Имя файла в multipart (если не задано — из File или `upload.bin`).
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8DetachOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string} recordId - Идентификатор записи.
 * @property {string} field - Имя поля вложения.
 * @property {object[]} data - Массив объектов вложений для отвязки.
 * @property {Z8MessagesHandler} [onMessages]
 */

/**
 * @typedef {Object} Z8ExportOptions
 * @property {string} request - Имя запроса/регистра в Z8 (обязательный).
 * @property {string} [format='pdf'] - Формат экспорта.
 * @property {object[]} columns - Описание колонок для экспорта (обязательный массив).
 * @property {object[]} [quickFilter] - Быстрые фильтры UI.
 * @property {object[]} [filter] - Условия фильтрации записей.
 * @property {object[]} [where] - Дополнительные условия отбора.
 * @property {Z8Period} [period] - Период отбора по датам.
 * @property {Z8MessagesHandler} [onMessages]
 */

export function defaultOnMessages(messages) {
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue
    const text = typeof m.text === 'string' ? m.text.trim() : ''
    if (!text) continue
    const type = typeof m.type === 'string' ? m.type : 'info'
    const extra = [m.source, m.time].filter(Boolean).join(' · ')
    console.log(`[Z8:${type}]`, text, extra || '')
  }
}

function defaultFetchImpl() {
  const f = globalThis.fetch
  if (typeof f !== 'function') return f
  return f.bind(globalThis)
}

export class Z8Http {
  constructor(options = {}) {
    this.url = options.url ?? '/request.json'
    this.session = options.session ?? null
    this.fetchImpl = options.fetchImpl ?? defaultFetchImpl()
    this.onMessages = options.onMessages ?? defaultOnMessages
  }

  _splitOptions(options = {}) {
    const { onMessages, ...rest } = options
    return { apiOptions: rest, onMessages }
  }

  _dispatchMessages(json, perCallOnMessages) {
    const raw = json?.info?.messages
    if (!Array.isArray(raw) || !raw.length) return
    const handler = perCallOnMessages ?? this.onMessages
    if (typeof handler === 'function') handler(raw)
  }

  setSession(session) {
    this.session = session && String(session).trim() ? String(session).trim() : null
  }

  requireSession() {
    if (!this.session) {
      throw new Error('Z8: session is not set. Log in first.')
    }
  }

  requireRequest(request) {
    if (!request || typeof request !== 'string' || !String(request).trim()) {
      throw new Error('Z8: request is required.')
    }
  }

  requireName(name) {
    if (!name || typeof name !== 'string' || !String(name).trim()) {
      throw new Error('Z8: name is required.')
    }
  }

  requireNonEmptyString(value, label) {
    if (!value || typeof value !== 'string' || !String(value).trim()) {
      throw new Error(`Z8: ${label} is required.`)
    }
  }

  _detailsJson(details) {
    if (details === undefined) {
      return JSON.stringify({})
    }
    if (details !== null && typeof details === 'object' && !Array.isArray(details)) {
      return JSON.stringify(details)
    }
    throw new Error('Z8: details must be an object.')
  }

  _encodeFormFields(fields) {
    const body = new URLSearchParams()
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue
      body.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    return body
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  _jobErrorMessage(json) {
    if (typeof json?.text === 'string' && json.text.trim()) return json.text.trim()
    if (typeof json?.message === 'string' && json.message.trim()) return json.message.trim()
    if (typeof json?.error === 'string' && json.error.trim()) return json.error.trim()
    return JSON.stringify(json ?? {})
  }

  _assertJobSuccess(json) {
    if (json?.success === false) {
      throw new Error(this._jobErrorMessage(json) || 'Z8 job failed')
    }
  }

  /**
   * @param {object} fields
   * @param {Z8CallOptions} [callOptions]
   */
  async postForm(fields, callOptions = {}) {
    const body = this._encodeFormFields(fields)

    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Z8 request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`)
    }

    const json = await res.json()
    this._dispatchMessages(json, callOptions.onMessages)
    return json
  }

  /**
   * @param {FormData} formData
   * @param {Z8CallOptions} [callOptions]
   */
  async postMultipart(formData, callOptions = {}) {
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Z8 request failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`)
    }

    const json = await res.json()
    this._dispatchMessages(json, callOptions.onMessages)
    return json
  }

  /**
   * Авторизация в Z8 API (`request: 'login'`).
   * @param {string} login
   * @param {string} [password]
   * @param {Z8CallOptions} [options]
   * @returns {Promise<object>}
   */
  async login(login, password, options = {}) {
    const { onMessages } = options
    const payload = {
      request: 'login',
      login,
      experimental: true,
    }

    const pwd = typeof password === 'string' ? password.trim() : password
    if (pwd !== undefined && pwd !== null && String(pwd).length > 0) {
      payload.password = pwd
    }

    return await this.postForm(payload, { onMessages })
  }

  /**
   * Собирает payload для `read` / `count` (`action: 'read'`).
   * @param {Z8ReadOptions} [options]
   * @returns {object}
   * @private
   */
  _buildReadPayload({
    request,
    query,
    fields,
    quickFilter,
    filter,
    where,
    sort,
    values,
    period = { start: null, finish: null },
    start = 0,
    limit = 200,
  } = {}) {
    this.requireSession()
    this.requireRequest(request)

    const payload = {
      action: 'read',
      request,
      period,
      start,
      limit,
      session: this.session,
    }

    if (query !== undefined && query !== null && String(query).length > 0) {
      payload.query = query
    }
    if (Array.isArray(fields) && fields.length > 0) {
      payload.fields = fields
    }
    if (Array.isArray(quickFilter) && quickFilter.length > 0) {
      payload.quickFilter = quickFilter
    }
    if (Array.isArray(filter) && filter.length > 0) {
      payload.filter = filter
    }
    if (Array.isArray(where) && where.length > 0) {
      payload.where = where
    }
    if (Array.isArray(sort) && sort.length > 0) {
      payload.sort = sort
    }
    if (values != null) {
      payload.values = values
    }

    return payload
  }

  /**
   * Собирает payload для `export` (`action: 'export'`).
   * @param {Z8ExportOptions} [options]
   * @returns {object}
   * @private
   */
  _buildExportPayload({
    request,
    format = 'pdf',
    columns,
    quickFilter,
    filter,
    where,
    period = { start: null, finish: null },
  } = {}) {
    this.requireSession()
    this.requireRequest(request)
    if (!Array.isArray(columns)) {
      throw new Error('Z8: columns must be an array.')
    }

    const payload = {
      action: 'export',
      request,
      format: format ?? 'pdf',
      columns,
      period,
      session: this.session,
    }

    if (Array.isArray(quickFilter) && quickFilter.length > 0) {
      payload.quickFilter = quickFilter
    }
    if (Array.isArray(filter) && filter.length > 0) {
      payload.filter = filter
    }
    if (Array.isArray(where) && where.length > 0) {
      payload.where = where
    }

    return payload
  }

  /**
   * Чтение данных регистра/запроса Z8 API (`action: 'read'`).
   * @param {Z8ReadOptions} [options]
   * @returns {Promise<object>}
   */
  async read(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    return await this.postForm(this._buildReadPayload(apiOptions), { onMessages })
  }

  /**
   * Подсчёт записей по тем же фильтрам, что и `read` (`count: 'true'`).
   * @param {Z8ReadOptions} [options]
   * @returns {Promise<object>}
   */
  async count(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const payload = this._buildReadPayload(apiOptions)
    payload.count = 'true'
    return await this.postForm(payload, { onMessages })
  }

  /**
   * Создание записей Z8 API (`action: 'create'`).
   * @param {Z8WriteOptions} [options]
   * @returns {Promise<object>}
   */
  async create(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, data } = apiOptions
    this.requireSession()
    this.requireRequest(request)

    return await this.postForm(
      {
        request,
        action: 'create',
        data: Array.isArray(data) ? data : [data],
        session: this.session,
      },
      { onMessages }
    )
  }

  /**
   * Обновление записей Z8 API (`action: 'update'`).
   * @param {Z8WriteOptions} [options]
   * @returns {Promise<object>}
   */
  async update(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, data } = apiOptions
    this.requireSession()
    this.requireRequest(request)

    return await this.postForm(
      {
        request,
        action: 'update',
        data: Array.isArray(data) ? data : [data],
        session: this.session,
      },
      { onMessages }
    )
  }

  /**
   * Удаление записей Z8 API (`action: 'destroy'`).
   * @param {Z8DestroyOptions} [options]
   * @returns {Promise<object>}
   */
  async destroy(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, ids } = apiOptions
    this.requireSession()
    this.requireRequest(request)

    const data = Array.isArray(ids)
      ? ids.map((id) => ({ recordId: String(id) }))
      : []

    return await this.postForm(
      {
        request,
        action: 'destroy',
        data,
        session: this.session,
      },
      { onMessages }
    )
  }

  /**
   * Прикрепление файла к записи Z8 API (`action: 'attach'`, multipart/form-data).
   * @param {Z8AttachOptions} [options]
   * @returns {Promise<object>}
   */
  async attach(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, recordId, field, details, file, fileName } = apiOptions
    this.requireSession()
    this.requireRequest(request)
    this.requireNonEmptyString(recordId, 'recordId')
    this.requireNonEmptyString(field, 'field')

    if (!(file instanceof Blob)) {
      throw new Error('Z8: file must be a Blob or File.')
    }

    const form = new FormData()
    form.append('request', request)
    form.append('action', 'attach')
    form.append('recordId', String(recordId).trim())
    form.append('field', String(field).trim())
    form.append('details', this._detailsJson(details))
    form.append('session', this.session)

    const name =
      (typeof fileName === 'string' && fileName.trim()) ||
      (typeof File !== 'undefined' && file instanceof File && file.name) ||
      'upload.bin'
    form.append('file', file, name)

    return await this.postMultipart(form, { onMessages })
  }

  /**
   * Отвязка вложений от записи Z8 API (`action: 'detach'`).
   * @param {Z8DetachOptions} [options]
   * @returns {Promise<object>}
   */
  async detach(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, recordId, field, data } = apiOptions
    this.requireSession()
    this.requireRequest(request)
    this.requireNonEmptyString(recordId, 'recordId')
    this.requireNonEmptyString(field, 'field')
    if (!Array.isArray(data)) {
      throw new Error('Z8: data must be an array.')
    }

    return await this.postForm(
      {
        request,
        action: 'detach',
        recordId: String(recordId).trim(),
        field: String(field).trim(),
        data,
        session: this.session,
      },
      { onMessages }
    )
  }

  /**
   * Выполнение серверного action Z8 API (`action: 'action'`).
   * @param {Z8ActionOptions} [options]
   * @returns {Promise<object>}
   */
  async action(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const { request, name, records, parameters = [] } = apiOptions
    this.requireSession()
    this.requireRequest(request)
    this.requireName(name)

    return await this.postForm(
      {
        request,
        action: 'action',
        name,
        records: Array.isArray(records) ? records : [],
        parameters: Array.isArray(parameters) ? parameters : [],
        session: this.session,
      },
      { onMessages }
    )
  }

  /**
   * Запуск серверной задачи Z8 и опрос до завершения (`done === true`).
   * @param {Z8JobOptions} [options]
   * @returns {Promise<object>}
   */
  async job(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    const {
      request,
      period = { start: null, finish: null },
      pollIntervalMs = 1000,
    } = apiOptions

    this.requireSession()
    this.requireRequest(request)

    let json = await this.postForm(
      {
        request,
        period,
        session: this.session,
      },
      { onMessages }
    )
    this._assertJobSuccess(json)

    while (json.done !== true) {
      const jobId = json.id
      const server = json.server
      const pollRequest = json.request
      if (
        !jobId ||
        typeof jobId !== 'string' ||
        !String(jobId).trim() ||
        !server ||
        typeof server !== 'string' ||
        !String(server).trim() ||
        !pollRequest ||
        typeof pollRequest !== 'string' ||
        !String(pollRequest).trim()
      ) {
        throw new Error('Z8: job poll requires id and server from response.')
      }

      await this._sleep(pollIntervalMs)

      json = await this.postForm(
        {
          request: pollRequest,
          server,
          job: jobId,
          session: this.session,
        },
        { onMessages }
      )
      this._assertJobSuccess(json)
    }

    return json
  }

  /**
   * Экспорт данных регистра Z8 API (`action: 'export'`).
   * @param {Z8ExportOptions} [options]
   * @returns {Promise<object>}
   */
  async export(options = {}) {
    const { apiOptions, onMessages } = this._splitOptions(options)
    return await this.postForm(this._buildExportPayload(apiOptions), { onMessages })
  }

  async report() {}
}
