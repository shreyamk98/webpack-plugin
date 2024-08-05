const ButtonJS = ({ onClick, label }) => (
  <button onClick={onClick}>{label}</button>
);

ButtonJS.propTypes = {
  /**
   * Function to handle click events.
   */
  onClick: PropTypes.func.isRequired,
  /**
   * Label to display on the button.
   */
  label: PropTypes.string.isRequired,
};

const App = () => {
  function MyButton2({ count, setCount }) {
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
