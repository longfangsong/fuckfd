import React, {useState} from 'react';
import './App.css';
import {Relation} from "./relation";

function App() {
    let [relation, setRelation] = useState(new Relation(new Set()));
    let [input, setInput] = useState("");
    let [findClosure, setFindClosure] = useState("");
    let [decomposeIntoStr, setDecomposeIntoStr] = useState("");
    let [decomposeInto, setDecomposeInto] = useState(new Set<Relation>());
    return (
        <div className="App">
            <header className="App-header">
                <input value={input} onChange={event => setInput((event.target as any).value)}/>
                <button onClick={() => {
                    setRelation(Relation.parse(input.split('-').join('->')))
                }}>确定
                </button>
                <div>候选键：{
                    Array.from(relation.candidateKeys)
                        .map(it => Array.from(it).join(''))
                        .join(',')
                }</div>
                <div>主属性：{
                    Array.from(relation.keyAttributes)
                        .join(',')
                }</div>
                <div><input value={findClosure} onChange={event => setFindClosure((event.target as any).value)}/>{
                    '+ = {' + Array.from(relation.propertyClosure(new Set(findClosure.split('')))).join('') + '}'
                }</div>
                <div>F+={Relation.minify(relation).result.toString()}</div>
                <div>2NF:<input type="checkbox" name="2nf" checked={relation.secondNF} disabled={true}/></div>
                <div>
                    3NF:
                    <input type="checkbox" name="3nf" checked={relation.thirdNF} disabled={true}/>
                    {
                        !(relation.thirdNF) &&
                        <p>分解成3NF: {Array.from(relation.toThirdNF()).map(it => Array.from(it.properties).join('')).join(',')}</p>
                    }
                </div>
                <div>BCNF:<input type="checkbox" name="bcnf" checked={relation.BCNF} disabled={true}/></div>
                <div>
                    <input value={decomposeIntoStr}
                           onChange={event => setDecomposeIntoStr((event.target as any).value)}/>
                    <button onClick={() => {
                        setDecomposeInto(new Set(decomposeIntoStr.split(',').map(Relation.parse)))
                    }}>确定
                    </button>
                    <div>无损:<input type="checkbox" name="lossless"
                                   checked={Relation.isLosslessDecompose(decomposeInto, relation).result}
                                   disabled={true}/>
                    </div>
                    <div>保持函数依赖:<input type="checkbox" name="keepfd"
                                       checked={Relation.preserveFDDecompose(decomposeInto, relation).result}
                                       disabled={true}/>
                    </div>
                </div>
            </header>
        </div>
    );
}

export default App;
