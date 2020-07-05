export function clone<T>(a: Set<T>): Set<T> {
    return new Set([...a]);
}

export function union<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a, ...b])
}

export function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a].filter(x => b.has(x)))
}

export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
    return new Set([...a].filter(x => !b.has(x)))
}

export function isSubSet<T>(maybeSubSet: Set<T>, superSet: Set<T>) {
    for (const element of maybeSubSet) {
        if (!superSet.has(element)) {
            return false;
        }
    }
    return true;
}

export function equal<T>(a: Set<T>, b: Set<T>): boolean {
    return isSubSet(a, b) && isSubSet(b, a);
}
