import {isSubSet} from "./util/set";

export class FunctionDependency {
    public constructor(public readonly from: Set<string>,
                       public readonly to: Set<string>) {
    }

    get isTrivial(): boolean {
        return isSubSet(this.to, this.from)
    }

    static parse(s: string): FunctionDependency {
        let [from, to] = s.split("->", 2);
        return new FunctionDependency(
            new Set(from.trim()),
            new Set(to.trim())
        )
    }

    public toString() {
        return Array.from(this.from).join('') + "->" + Array.from(this.to).join('');
    }
}
