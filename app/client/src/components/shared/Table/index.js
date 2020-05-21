// @flow

import React from 'react';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import './tableStyles.css';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
// helpers
import { fetchCheck } from 'utils/fetchUtils';

type Props = {
  addCheckBox: boolean,
  apiUrl?: string,
  checkAll: boolean,
  data?: Array<Object>,
  dataIdColumn: string,
  header: Array<Object>,
  onChange: Function,
  responseParser?: Function,
};

type State = {
  displayData: ?Array<Object>,
  selected: Object,
  selectAll: number,
};

class Table extends React.Component<Props, State> {
  static defaultProps = {
    addCheckBox: false,
  };

  state: State = {
    displayData: [],
    loading: true,
    selected: {},
    selectAll: 0,
  };

  componentDidMount() {
    if (this.props.apiUrl) {
      fetchCheck(this.props.apiUrl).then(this.handleResponse, (error) => {
        console.error(error);
      });
    } else {
      this.setState({ displayData: this.props.data, loading: false });
    }
  }

  //Check all rows if the input data changed
  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      JSON.stringify(prevState.displayData) !==
      JSON.stringify(this.state.displayData)
    ) {
      if (this.props.checkAll) {
        this.toggleSelectAll();
      }
    }
  }

  componentWillReceiveProps(newProps: Props) {
    if (!this.props.apiUrl) {
      if (
        JSON.stringify(newProps.data) !== JSON.stringify(this.state.displayData)
      ) {
        this.setState({ displayData: newProps.data });
      }
    }
  }

  handleResponse = (response: Object) => {
    if (typeof this.props.responseParser === 'function') {
      this.setState({
        displayData: this.props.responseParser(response),
        loading: false,
      });
    }
  };

  //Toggle an individual row and call the provided onChange event handler
  toggleRow = (item: any) => {
    const newSelected = Object.assign({}, this.state.selected);
    newSelected[item] = !this.state.selected[item];
    this.setState({
      selected: newSelected,
      selectAll: 2,
    });

    //Call the provided on change event handler
    if (typeof this.props.onChange === 'function')
      this.props.onChange(newSelected);
  };

  //Toggle all rows and call the provided onChange event handler
  toggleSelectAll() {
    const { displayData, selectAll } = this.state;
    let newSelected = {};

    if (displayData) {
      const newValue = selectAll === 0 ? true : false;

      displayData.forEach((x) => {
        newSelected[x[this.props.dataIdColumn]] = newValue;
      });
    }

    this.setState({
      selected: newSelected,
      selectAll: selectAll === 0 ? 1 : 0,
    });

    //Call the provided on change event handler
    if (typeof this.props.onChange === 'function')
      this.props.onChange(newSelected);
  }

  render() {
    const header = this.props.header;
    const { displayData, selectAll, selected } = this.state;

    //Add the checkbox column
    if (this.props.addCheckBox) {
      //Verify the header object is an array
      if (Array.isArray(header)) {
        //Create the checkbox column
        const checkBox = {
          id: 'checkbox',
          accessor: '',
          Cell: ({ original }) => {
            return (
              <div className="cell-checkbox">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={
                    selected[original[this.props.dataIdColumn]] === true ||
                    selectAll === 1
                  }
                  onChange={() =>
                    this.toggleRow(original[this.props.dataIdColumn])
                  }
                />
              </div>
            );
          },
          Header: (x) => {
            return (
              <input
                type="checkbox"
                className="checkbox"
                checked={selectAll === 1}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = selectAll === 2;
                  }
                }}
                onChange={() => this.toggleSelectAll()}
              />
            );
          },
          sortable: false,
          width: 45,
        };

        //Add the checkbox column as the first column in the table
        if (header.length === 0 || header[0].id !== 'checkbox') {
          header.unshift(checkBox);
        }
      }
    }

    if (this.state.loading) return <LoadingSpinner />;

    return (
      <>
        <div>
          {displayData !== undefined &&
            displayData !== null &&
            displayData.length > 0 && (
              <ReactTable
                data={displayData}
                columns={header}
                //defaultSorted={[{ id: "firstName", desc: false }]}
                pageSize={displayData.length}
                showPagination={false}
              />
            )}
        </div>
      </>
    );
  }
}
export default Table;
