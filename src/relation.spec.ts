import {Relation} from "./relation";
import {FunctionDependency} from "./function_dependency";

test("PropertyClosure Test", () => {
    let relation = new Relation(new Set<FunctionDependency>([
        new FunctionDependency(new Set(["A"]), new Set(["B"])),
        new FunctionDependency(new Set(["B"]), new Set(["C"])),
        new FunctionDependency(new Set(["D"]), new Set(["B"]))
    ]));
    let aClousre = relation.propertyClosure(new Set<string>(["A"]));
    expect(aClousre.size).toEqual(3);
    expect(aClousre).toContain("A");
    expect(aClousre).toContain("B");
    expect(aClousre).toContain("C");
    let adClousre = relation.propertyClosure(new Set<string>(["A", "D"]));
    expect(adClousre.size).toEqual(4);
    let bdClousre = relation.propertyClosure(new Set<string>(["B", "D"]));
    expect(bdClousre.size).toEqual(3);
    expect(bdClousre).not.toContain("A");
});

test("CandidateKeys Test", () => {
    let relation = new Relation(new Set<FunctionDependency>([
        FunctionDependency.parse("B->C"),
        FunctionDependency.parse("B->E"),
        FunctionDependency.parse("C->B"),
        FunctionDependency.parse("C->D")
    ]));
    relation.addProperty("A");
    let candidateKeys = relation.candidateKeys;
    expect(candidateKeys.size).toEqual(2);
    expect(candidateKeys).toEqual(new Set([new Set(["A", "B"]), new Set(["A", "C"])]));
    relation = new Relation(new Set<FunctionDependency>([
        new FunctionDependency(new Set(["A"]), new Set(["B"])),
        new FunctionDependency(new Set(["A"]), new Set(["C"])),
        new FunctionDependency(new Set(["B"]), new Set(["C"]))
    ]));
    candidateKeys = relation.candidateKeys;
    expect(candidateKeys.size).toEqual(1);
    expect(candidateKeys).toEqual(new Set([new Set(["A"])]));
});

test("EliminatePropertyProcess Test", () => {
    let relation = new Relation(new Set<FunctionDependency>([
        new FunctionDependency(new Set(["A"]), new Set(["D"])),
        new FunctionDependency(new Set(["B"]), new Set(["D"])),
        new FunctionDependency(new Set(["B", "D"]), new Set(["C", "A"])),
        new FunctionDependency(new Set(["C", "D"]), new Set(["B"]))
    ]));
    let eliminated = Relation.eliminatePropertyProcess(relation);
    expect(eliminated.process.length).toEqual(6);
    expect(eliminated.result.fds).toEqual(new Set([
        FunctionDependency.parse("A->D"),
        FunctionDependency.parse("B->D"),
        FunctionDependency.parse("B->C"),
        FunctionDependency.parse("B->A"),
        FunctionDependency.parse("CD->B"),
    ]));
});

test("EliminateFDProcess Test", () => {
    let relation = new Relation(new Set<FunctionDependency>([
        FunctionDependency.parse("A->D"),
        FunctionDependency.parse("B->D"),
        FunctionDependency.parse("B->C"),
        FunctionDependency.parse("B->A"),
        FunctionDependency.parse("CD->B"),
    ]));
    let eliminated = Relation.eliminateFDProcess(relation);
    expect(eliminated.process.length).toEqual(5);
    expect(eliminated.result.fds).toEqual(new Set([
        FunctionDependency.parse("A->D"),
        FunctionDependency.parse("B->C"),
        FunctionDependency.parse("B->A"),
        FunctionDependency.parse("CD->B"),
    ]));
});

test("isLosslessDecompose Test", () => {
    let relation = Relation.parse("A->C,B->C,C->D,CE->A,DE->C");
    let decomposed = new Set([
        Relation.parse("AD"),
        Relation.parse("AB"),
        Relation.parse("BE"),
        Relation.parse("CDE"),
        Relation.parse("AE"),
    ]);
    let result = Relation.isLosslessDecompose(decomposed, relation);
    expect(result.result).toEqual(true);

    relation = Relation.parse("A->C,B->C,C->D,CE->A,DE->C");
    decomposed = new Set([
        Relation.parse("AD"),
        Relation.parse("AB"),
        Relation.parse("BE"),
        Relation.parse("CDE"),
        Relation.parse("AE"),
    ]);
    result = Relation.isLosslessDecompose(decomposed, relation);
    expect(result.result).toEqual(true);

    relation = Relation.parse("A->B,C->D");
    decomposed = new Set([
        Relation.parse("AB"),
        Relation.parse("AB"),
        Relation.parse("BC"),
        Relation.parse("CD")
    ]);
    result = Relation.isLosslessDecompose(decomposed, relation);
    expect(result.result).toEqual(false);
});

test("preserveFDDecompose Test", () => {
    let relation = Relation.parse("A->C,B->C,C->D,CE->A,DE->C");
    let decomposed = new Set([
        Relation.parse("AD"),
        Relation.parse("AB"),
        Relation.parse("BE"),
        Relation.parse("CDE"),
        Relation.parse("AE"),
    ]);
    let result = Relation.preserveFDDecompose(decomposed, relation);
    expect(result.result).toEqual(false);

    decomposed = new Set([
        Relation.parse("ACE"),
        Relation.parse("BC"),
        Relation.parse("CDE")
    ]);
    result = Relation.preserveFDDecompose(decomposed, relation);
    expect(result.result).toEqual(true);
});

test("secondNF Test", () => {
    let relation = Relation.parse("SC->G,S->NA");
    expect(relation.secondNF).toEqual(false);
    relation = Relation.parse("A->B,B->C");
    expect(relation.secondNF).toEqual(true);
});

test("thirdNF Test", () => {
    let relation = Relation.parse("A->B,B->C");
    expect(relation.thirdNF).toEqual(false);
    relation = Relation.parse("A->B,BC->A");
    expect(relation.thirdNF).toEqual(true);
});

test("BCNF Test", () => {
    let relation = Relation.parse("A->B,BC->A");
    expect(relation.BCNF).toEqual(false);
    relation = Relation.parse("A->B,A->C");
    expect(relation.BCNF).toEqual(true);
});
