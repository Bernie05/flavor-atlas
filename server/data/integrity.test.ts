import { describe, expect, it } from 'vitest'
import { checkIntegrity } from './integrity'

const data = {
  recipes: [
    { id: '1', cuisineId: 'filipino', dishId: 'adobo', regionId: '' },
    { id: '2', cuisineId: 'filipino', dishId: 'adobo', regionId: 'batangas' },
  ],
}

describe('checkIntegrity', () => {
  it('refuses to delete a cuisine, dish or region a recipe still uses', () => {
    expect(checkIntegrity('DELETE', '/cuisines/filipino?_dependent=dishes&_dependent=regions', data)).toMatchObject({
      status: 409,
      body: { message: '2 recipes still use this. Delete or move them first.' },
    })
    expect(checkIntegrity('delete', '/dishes/adobo', data)?.status).toBe(409)
    expect(checkIntegrity('DELETE', '/regions/batangas', data)?.body.message).toMatch(/^1 recipe still uses this/)
  })

  it('lets everything else through', () => {
    expect(checkIntegrity('DELETE', '/cuisines/thai', data)).toBeNull() // no recipes yet
    expect(checkIntegrity('DELETE', '/recipes/1?_dependent=ratings', data)).toBeNull()
    expect(checkIntegrity('GET', '/cuisines/filipino', data)).toBeNull()
    expect(checkIntegrity('PUT', '/cuisines/filipino', data)).toBeNull()
    expect(checkIntegrity('DELETE', '/cuisines', data)).toBeNull()
  })

  it('reads ids the way json-server does, percent-decoded', () => {
    expect(checkIntegrity('DELETE', '/dishes/ad%6Fbo', data)?.status).toBe(409)
  })
})
