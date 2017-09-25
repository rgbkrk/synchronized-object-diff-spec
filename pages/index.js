// @format
import React from 'react';

class SubTree extends React.Component {
  render() {
    return (
      <div>
        <p onChange={this.props.onChange}>
          hey <input name="thing" value={this.props.models['thing']} />
          <input name="r" value={this.props.models['r']} type="range" />
        </p>
        <p>woo</p>
        <button
          name="pushy"
          data-what="12"
          onClick={ev => {
            ev.persist();
            console.log(ev);
            console.log(ev.target);
          }}>
          Pushy
        </button>
      </div>
    );
  }
}

export default class DynamicSubTree extends React.Component {
  state = {
    models: {},
  };

  componentDidUpdate() {
    console.log(this.state);
  }

  changey = event => {
    if (event.target && event.target.name) {
      this.setState({[event.target.name]: event.target.value});
    }
  };

  render() {
    return <SubTree models={this.state.models} onChange={this.changey} />;
  }
}
