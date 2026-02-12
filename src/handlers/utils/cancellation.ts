// Global cancellation tokens for streaming operations
const cancelledOperations = new Set<string>()

export function cancelOperation(operationId: string) {
  cancelledOperations.add(operationId)
  // Clean up after 60 seconds
  setTimeout(() => cancelledOperations.delete(operationId), 60000)
}

export function isOperationCancelled(operationId: string): boolean {
  return cancelledOperations.has(operationId)
}

export function clearCancelledOperation(operationId: string) {
  cancelledOperations.delete(operationId)
}
