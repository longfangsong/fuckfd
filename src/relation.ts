import {FunctionDependency} from "./function_dependency";
import {clone, difference, intersect, isSubSet, union} from "./util/set";
import {clone as matrixClone} from "./util/matrix";

export interface EliminatePropertyProcess {
    oldFD: FunctionDependency,
    propertyEliminated: string,
    closureAfterEliminate: Set<string>,
    canEliminate: boolean
}

export interface EliminateFDProcess {
    fd: FunctionDependency,
    closureAfterEliminate: Set<string>,
    canEliminate: boolean
}

export interface MinifyProcess {
    eliminateProperty: Array<EliminatePropertyProcess>
    eliminateFD: Array<EliminateFDProcess>,
    result: Relation
}

export interface CheckLosslessDecomposeProcess {
    process: Array<{
        useFD: FunctionDependency,
        resultMatrix: Array<Array<'A' | number>>
    }>
}

export class Relation {
    readonly properties: Set<string>;
    readonly fds: Set<FunctionDependency>;

    public static parse(s: string): Relation {
        let fdStrs = s.split(',');
        let fds = new Set(fdStrs
            .filter((it) => it.includes('->'))
            .map(FunctionDependency.parse));
        let result = new Relation(fds);
        let rests = fdStrs.filter((it) => !it.includes('->'));
        for (const rest of rests) {
            for (const element of rest) {
                result.addProperty(element);
            }
        }
        return result;
    }

    public constructor(
        fds: Set<FunctionDependency>
    ) {
        this.fds = new Set<FunctionDependency>();
        for (const fd of fds) {
            for (const to of fd.to) {
                this.fds.add(new FunctionDependency(fd.from, new Set([to])));
            }
        }
        this.properties = new Set<string>();
        for (const fd of fds) {
            this.properties = union(this.properties, fd.from);
            this.properties = union(this.properties, fd.to);
        }
    }

    public addProperty(property: string) {
        this.properties.add(property)
    }

    public addFD(fd: FunctionDependency) {
        for (let to of fd.to) {
            this.fds.add(new FunctionDependency(fd.from, new Set<string>(to)));
        }
    }

    public propertyClosure(properties: Set<string>): Set<string> {
        let result = new Set([...properties]);
        let last_size = 1;
        while (true) {
            for (const fd of this.fds) {
                let all_in = true;
                for (const from of fd.from) {
                    if (!result.has(from)) {
                        all_in = false;
                        break;
                    }
                }
                if (all_in) {
                    for (const to of fd.to) {
                        result.add(to)
                    }
                }
            }
            if (result.size === last_size) {
                break;
            } else {
                last_size = result.size;
            }
        }
        return result;
    }

    public canDecide(lhs: Set<string>, rhs: Set<string>): boolean {
        return isSubSet(rhs, this.propertyClosure(lhs));
    }

    get candidateKeys(): Set<Set<string>> {
        let existInRight = new Set<string>();
        let existInLeft = new Set<string>();
        for (const fd of this.fds) {
            existInRight = union(existInRight, fd.to);
            existInLeft = union(existInLeft, fd.from);
        }
        let mustHave = difference(this.properties, existInRight);
        let mustNotHave = difference(existInRight, existInLeft);
        let possibleToHave = difference(difference(this.properties, mustHave), mustNotHave);
        let result = new Set<Set<string>>();
        if (this.propertyClosure(mustHave).size === this.properties.size) {
            result.add(mustHave);
        } else {
            for (const possibleToHaveElement of possibleToHave) {
                let mayBeCandidateKey = union(mustHave, new Set([possibleToHaveElement]));
                if (this.propertyClosure(mayBeCandidateKey).size === this.properties.size) {
                    result.add(mayBeCandidateKey);
                }
            }
        }
        return result;
    }

    get keyAttributes(): Set<string> {
        return new Set(Array.from(this.candidateKeys)
            .reduce((a, b) => union(a, b)));
    }

    static minify(relation: Relation): MinifyProcess {
        let eliminatePropertyResult = this.eliminatePropertyProcess(relation);
        let eliminateFDResult = this.eliminateFDProcess(eliminatePropertyResult.result);
        return {
            eliminateProperty: eliminatePropertyResult.process,
            eliminateFD: eliminateFDResult.process,
            result: eliminateFDResult.result
        }
    }

    public static eliminatePropertyProcess(relation: Relation): { process: Array<EliminatePropertyProcess>, result: Relation } {
        let eliminatePropertyProcess = [];
        let oldFDs = relation.fds;
        let newFDs = clone(oldFDs);
        for (const fd of oldFDs) {
            if (fd.from.size > 1) {
                newFDs.delete(fd);
                let newFrom = clone(fd.from);
                for (const toRemove of fd.from) {
                    newFrom.delete(toRemove);
                    let closureAfterEliminate = relation.propertyClosure(newFrom)
                    let canEliminate = isSubSet(fd.to, closureAfterEliminate);
                    eliminatePropertyProcess.push({
                        oldFD: fd,
                        propertyEliminated: toRemove,
                        closureAfterEliminate,
                        canEliminate
                    });
                    if (!canEliminate) {
                        newFrom.add(toRemove);
                    }
                }
                newFDs.add(new FunctionDependency(newFrom, fd.to));
            }
        }
        return {
            process: eliminatePropertyProcess,
            result: new Relation(newFDs)
        }
    }

    public static eliminateFDProcess(relation: Relation): { process: Array<EliminateFDProcess>, result: Relation } {
        let eliminateFDProcess = [];
        let oldFDs = relation.fds;
        let newFDs = clone(oldFDs);
        for (const fd of oldFDs) {
            newFDs.delete(fd);
            let eliminated = new Relation(newFDs);
            let closureAfterEliminate = eliminated.propertyClosure(fd.from);
            let canEliminate = isSubSet(fd.to, closureAfterEliminate);
            eliminateFDProcess.push({
                fd,
                closureAfterEliminate,
                canEliminate
            });
            if (!canEliminate) {
                newFDs.add(fd);
            }
        }
        return {
            process: eliminateFDProcess,
            result: new Relation(newFDs)
        }
    }

    public static isLosslessDecompose(to: Set<Relation>, from: Relation): {
        initialMatrix: Array<Array<'A' | number>>,
        process: CheckLosslessDecomposeProcess,
        result: boolean
    } {
        let result = false;
        let process: CheckLosslessDecomposeProcess = {process: []};
        let columns = Array.from(from.properties).sort();
        let rows = Array.from(to);
        let matrix: Array<Array<'A' | number>> = [];
        for (let i = 0; i < rows.length; ++i) {
            let row = rows[i];
            let matrixRow: Array<'A' | number> = [];
            for (const col of columns) {
                if (row.properties.has(col)) {
                    matrixRow.push('A')
                } else {
                    matrixRow.push(i + 1);
                }
            }
            matrix.push(matrixRow);
        }
        let initialMatrix = matrixClone(matrix);
        let canExit = false;
        while (!canExit) {
            canExit = true;
            for (const fd of from.fds) {
                let fdTo = Array.from(fd.to)[0];
                let selectedColumns = Array.from(fd.from)
                    .map((it) => columns.indexOf(it));
                // finding out which rows are all same with matrix[i][selectedColumns]
                let sameRows = [0];
                for (let i = 0; i < rows.length - 1; ++i) {
                    sameRows = [i];
                    for (let j = i + 1; j < rows.length; ++j) {
                        let allColumnsSame = true;
                        for (const column of selectedColumns) {
                            if (matrix[i][column] !== matrix[j][column]) {
                                allColumnsSame = false;
                                break;
                            }
                        }
                        if (allColumnsSame) {
                            sameRows.push(j);
                        }
                    }
                    if (sameRows.length >= 2) {
                        break;
                    }
                }
                if (sameRows.length !== 1) {
                    // change matrix[sameRows][fd.to] into min(matrix[sameRows][fd.to])
                    let minValue: 'A' | number = Infinity;
                    for (const row of sameRows) {
                        let oldValue = matrix[row][columns.indexOf(fdTo)];
                        if (oldValue === 'A') {
                            minValue = 'A';
                            break;
                        } else {
                            minValue = Math.min(minValue, oldValue);
                        }
                    }
                    for (const row of sameRows) {
                        if (matrix[row][columns.indexOf(fdTo)] !== minValue) {
                            canExit = false;
                            matrix[row][columns.indexOf(fdTo)] = minValue;
                        }
                    }
                }
                process.process.push({
                    useFD: fd,
                    resultMatrix: matrixClone(matrix)
                });
                for (const row of matrix) {
                    let allA = true;
                    for (const col of row) {
                        if (col !== 'A') {
                            allA = false;
                            break;
                        }
                    }
                    if (allA) {
                        canExit = true;
                        result = true;
                        break;
                    }
                }
            }
        }
        return {
            process,
            result,
            initialMatrix
        }
    }

    public static preserveFDDecompose(to: Set<Relation>, from: Relation): { result: boolean, failOnFd?: FunctionDependency } {
        for (const fd of from.fds) {
            let result = clone(fd.from);
            let changed: boolean;
            do {
                changed = false;
                for (const toRelation of to) {
                    let t = intersect(from.propertyClosure(intersect(result, toRelation.properties)), toRelation.properties)
                    let newResult = union(result, t);
                    if (newResult.size !== result.size) {
                        result = newResult;
                        changed = true;
                    }
                }
            } while (changed);
            if (!isSubSet(fd.to, result)) {
                return {result: false, failOnFd: fd};
            }
        }
        return {result: true}
    }

    get secondNF(): boolean {
        let keyCodes = this.keyCodes;
        let candidateKeys = this.candidateKeys;
        for (const attribute of this.properties) {
            let isKeyCode = keyCodes.has(attribute);
            if (isKeyCode) continue;
            for (const candidateKey of candidateKeys) {
                for (const toRemove of candidateKey) {
                    let partialCandidateKey = clone(candidateKey);
                    partialCandidateKey.delete(toRemove);
                    if (this.canDecide(partialCandidateKey, new Set(attribute))) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    get keyCodes(): Set<string> {
        let keyCodes = new Set<string>();
        for (const candidateKey of this.candidateKeys) {
            keyCodes = union(keyCodes, candidateKey);
        }
        return keyCodes;
    }

    get thirdNF(): boolean {
        if (!this.secondNF) {
            return false;
        }
        let candidateKeys = this.candidateKeys;
        let keyAttributes = this.keyAttributes;
        for (const fd of this.fds) {
            let leftIsSuperkey = false;
            for (const candidateKey of candidateKeys) {
                if (isSubSet(candidateKey, fd.from)) {
                    leftIsSuperkey = true;
                    break;
                }
            }
            if (!leftIsSuperkey) {
                for (const attribute of fd.to) {
                    if (!keyAttributes.has(attribute)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    get BCNF(): boolean {
        if (!this.secondNF) {
            return false;
        }
        let candidateKeys = this.candidateKeys;
        let keyAttributes = this.keyAttributes;
        for (const fd of this.fds) {
            let leftIsSuperkey = false;
            for (const candidateKey of candidateKeys) {
                if (isSubSet(candidateKey, fd.from)) {
                    leftIsSuperkey = true;
                    break;
                }
            }
            if (!leftIsSuperkey) {
                return false;
            }
        }
        return true;
    }

    public toString() {
        return Array.from(this.fds).join(',');
    }
}
