import '@testing-library/jest-dom'

Object.defineProperty(global, 'Headers', {
  writable: true,
  value: class Headers {
    constructor(init = {}) {
      this.headers = {}
      if (typeof init === 'object') {
        if (init instanceof Headers) {
          Object.assign(this.headers, init.headers)
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this.headers[key.toLowerCase()] = value
          })
        } else {
          Object.entries(init).forEach(([key, value]) => {
            this.headers[key.toLowerCase()] = value
          })
        }
      }
    }

    get(name) {
      return this.headers[name.toLowerCase()]
    }

    set(name, value) {
      this.headers[name.toLowerCase()] = value
    }

    has(name) {
      return name.toLowerCase() in this.headers
    }

    delete(name) {
      delete this.headers[name.toLowerCase()]
    }

    append(name, value) {
      const key = name.toLowerCase()
      if (key in this.headers) {
        this.headers[key] += ', ' + value
      } else {
        this.headers[key] = value
      }
    }

    forEach(callback) {
      Object.entries(this.headers).forEach(([key, value]) => {
        callback(value, key, this)
      })
    }

    entries() {
      return Object.entries(this.headers)[Symbol.iterator]()
    }

    keys() {
      return Object.keys(this.headers)[Symbol.iterator]()
    }

    values() {
      return Object.values(this.headers)[Symbol.iterator]()
    }
  }
})

Object.defineProperty(global, 'Response', {
  writable: true,
  value: class Response {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Headers(options.headers)
      this.ok = this.status >= 200 && this.status < 300
      this.redirected = options.redirected || false
      this.type = options.type || 'basic'
      this.url = options.url || ''
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }

    async blob() {
      return new Blob([this.body])
    }

    async arrayBuffer() {
      return new TextEncoder().encode(this.body).buffer
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      })
    }
  }
})

Object.defineProperty(global, 'Request', {
  writable: true,
  value: class Request {
    constructor(input, options = {}) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input.url
      }
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers)
      this.body = options.body
      this.cache = options.cache || 'default'
      this.credentials = options.credentials || 'same-origin'
      this.integrity = options.integrity || ''
      this.keepalive = options.keepalive || false
      this.mode = options.mode || 'cors'
      this.redirect = options.redirect || 'follow'
      this.referrer = options.referrer || 'about:client'
      this.referrerPolicy = options.referrerPolicy || ''
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }

    async blob() {
      return new Blob([this.body])
    }

    async arrayBuffer() {
      return new TextEncoder().encode(this.body).buffer
    }

    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      })
    }
  }
})

jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(input, options = {}) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input.url
      }
      this.method = options.method || 'GET'
      this.headers = new Headers(options.headers)
      this.body = options.body
      this.cache = options.cache || 'default'
      this.credentials = options.credentials || 'same-origin'
      this.integrity = options.integrity || ''
      this.keepalive = options.keepalive || false
      this.mode = options.mode || 'cors'
      this.redirect = options.redirect || 'follow'
      this.referrer = options.referrer || 'about:client'
      this.referrerPolicy = options.referrerPolicy || ''
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }

    async blob() {
      return new Blob([this.body])
    }

    async arrayBuffer() {
      return new TextEncoder().encode(this.body).buffer
    }

    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      })
    }
  },
  NextResponse: {
    json: (body, options = {}) => {
      const response = new Response(JSON.stringify(body), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      return response
    }
  }
}))
