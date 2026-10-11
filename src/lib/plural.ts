/** A count with its word: "1 recipe", "3 recipes". Irregular plurals go in `many` ("2 dishes"). */
export const countOf = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
