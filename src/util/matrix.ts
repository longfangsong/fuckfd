export function clone<T>(a: Array<Array<T>>): Array<Array<T>> {
    let result = [];
    for (const row of a) {
        result.push([...row]);
    }
    return result;
}
