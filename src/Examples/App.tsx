import React, { Component, useContext } from "react";

const someFunc = (someShitfunc: string): string => {
  console.log(someShitfunc);
  return "asfasdfs";
};
// Using Arrow Function
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
interface PropsType {
  name: string;
}
//CLASS COMPONENT
class MyClassComponent extends Component<PropsType, { count: number }> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      count: 0,
    };
  }

  render() {
    return (
      <div>
        Hello, {this.props.name}! Count: {this.state.count}
      </div>
    );
  }
}
// Using React.FC (React.FunctionComponent)
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

interface MyComponentProps<T> {
  item: T;
}
// Using Generics with Functional Components
const MyComponentWithGenerics = <T extends string>({
  item,
}: MyComponentProps<T>) => {
  return <div>{JSON.stringify(item)}</div>;
};

// Using Function Declaration
function MyFunctionalComponent({
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

const MyContext = React.createContext<string>("default value");

interface MyComponentProps2 {
  name: string;
}

const MyComponentWithContext: React.FC<MyComponentProps2> = ({ name }) => {
  const contextValue = useContext(MyContext);

  return (
    <div>
      Hello, {name}! Context Value: {contextValue}
    </div>
  );
};
//todo see this
const MyMemoizedComponent: React.FC<MyComponentProps2> = React.memo(
  ({ name }) => {
    return <div>Hello, {name}!</div>;
  },
);

export default App;
