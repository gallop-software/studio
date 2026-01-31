/**
 * Utility functions to replace NextResponse with standard Response
 * This allows handlers to work without Next.js dependency
 */

/**
 * Create a JSON response (mimics NextResponse.json)
 */
export function jsonResponse<T>(
  data: T,
  init?: { status?: number; headers?: Record<string, string> }
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...init?.headers,
  })

  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers,
  })
}

/**
 * Create a streaming response for Server-Sent Events
 */
export function streamResponse(
  stream: ReadableStream,
  init?: { headers?: Record<string, string> }
): Response {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    ...init?.headers,
  })

  return new Response(stream, {
    status: 200,
    headers,
  })
}

/**
 * Create an SSE encoder for streaming responses
 */
export function createSSEStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  return {
    stream,
    send(event: string, data: unknown) {
      if (controller) {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }
    },
    close() {
      if (controller) {
        controller.close()
      }
    },
  }
}
