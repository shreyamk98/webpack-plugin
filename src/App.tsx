import React from "react";

const someFunc = (someShitfunc: string): string => {
  console.log(someShitfunc);
  return "asfasdfs";
};

const MyButton = ({
  countss,
  setCount,
}: {
  countss: number;
  setCount: (v: number) => void;
}) => {
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
  function MyButton2({
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
  const [count, setCount] = React.useState(0);
  return (
    <>
      <MyButton2 count={count} setCount={setCount} />
      <MyButton countss={count} setCount={setCount} />
      <h1>Hello, React + TypeScript!</h1>;
    </>
  );
};

export default App;
