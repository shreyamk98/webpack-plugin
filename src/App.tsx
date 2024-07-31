import React from "react";

const someSHitFunction = (someShitfunc: string): string => {
  console.log(someShitfunc);
  return "asfasdfs";
};

const MyButton: React.FC<{
  countss: number;
  setCount: (v: number) => void;
}> = ({ countss, setCount }) => {
  return (
    <button onClick={() => setCount(countss + 1)}>count is {countss}</button>
  );
};

function MyButton1({
  count,
  setCount,
}: {
  count: number;
  setCount: (v: number) => void;
}) {
  return (
    <>
      <button onClick={() => setCount(count + 1)}>count is {count}</button>;
    </>
  );
}

const App: React.FC = () => {
  return <h1>Hello, React + TypeScript!</h1>;
};

export default App;
