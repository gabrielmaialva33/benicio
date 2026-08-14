import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import YAML from 'yaml'

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'])

interface OpenApiOperation {
  'operationId'?: unknown
  'x-permission'?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function openApiPaths(document: unknown): Record<string, Record<string, OpenApiOperation>> {
  if (!isRecord(document) || !isRecord(document.paths)) {
    throw new Error('OpenAPI document must contain a paths object')
  }

  return Object.fromEntries(
    Object.entries(document.paths).map(([path, pathItem]) => {
      if (!isRecord(pathItem)) throw new Error(`Invalid OpenAPI path item: ${path}`)
      return [path, pathItem as Record<string, OpenApiOperation>]
    })
  )
}

function documentedRouteKeys(paths: Record<string, Record<string, OpenApiOperation>>): string[] {
  return Object.entries(paths).flatMap(([path, pathItem]) =>
    Object.keys(pathItem)
      .filter((method) => HTTP_METHODS.has(method))
      .map((method) => `${method.toUpperCase()} ${path}`)
  )
}

function normalizeRoutePattern(pattern: string): string {
  return pattern.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
}

test.group('OpenAPI contract', (group) => {
  group.setup(async () => {
    await import('#start/routes')
    if (!router.commited) router.commit()
  })

  test('documents every public API and Transmit route without stale operations', async ({
    assert,
  }) => {
    const source = await readFile(app.makePath('docs/openapi.yaml'), 'utf8')
    const paths = openApiPaths(YAML.parse(source) as unknown)
    const publicRoutes = Object.values(router.toJSON())
      .flat()
      .filter(
        (route) =>
          route.pattern === '/version' ||
          route.pattern.startsWith('/api/v1') ||
          route.pattern.startsWith('/__transmit')
      )

    const runtimeKeys = publicRoutes.flatMap((route) =>
      route.methods
        .filter((method) => method !== 'HEAD')
        .map((method) => `${method} ${normalizeRoutePattern(route.pattern)}`)
    )
    assert.deepEqual(documentedRouteKeys(paths).sort(), runtimeKeys.sort())

    const operationIds = Object.values(paths).flatMap((pathItem) =>
      Object.entries(pathItem)
        .filter(([method]) => HTTP_METHODS.has(method))
        .map(([, operation]) => operation.operationId)
    )
    assert.isTrue(operationIds.every((operationId) => typeof operationId === 'string'))
    assert.equal(new Set(operationIds).size, operationIds.length)
  })

  test('keeps documented permission names aligned with route middleware', async ({ assert }) => {
    const source = await readFile(app.makePath('docs/openapi.yaml'), 'utf8')
    const paths = openApiPaths(YAML.parse(source) as unknown)
    const publicRoutes = Object.values(router.toJSON())
      .flat()
      .filter((route) => route.pattern.startsWith('/api/v1'))

    for (const route of publicRoutes) {
      const permission = [...route.middleware.all()].find(
        (middleware) => middleware.name === 'permission'
      )
      if (!permission || !('args' in permission) || !isRecord(permission.args)) continue
      const expectedPermission = permission.args.permissions
      if (typeof expectedPermission !== 'string') continue

      for (const method of route.methods) {
        if (method === 'HEAD') continue
        const operation = paths[normalizeRoutePattern(route.pattern)]?.[method.toLowerCase()]
        assert.equal(
          operation?.['x-permission'],
          expectedPermission,
          `${method} ${route.pattern} must document its permission middleware`
        )
      }
    }
  })
})
