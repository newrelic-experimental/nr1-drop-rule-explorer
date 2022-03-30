import React, { useState } from 'react';
import { navigation, BlockText,AccountsQuery, AccountPicker, NerdGraphQuery, Spinner, Table, TableHeader, TableHeaderCell,TableRow, TableRowCell, Tile, HeadingText, TileGroup, Link } from 'nr1';

function DropRuleExplorer() {
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [sortingType, setSortingType] = useState(0);
  const [sortColumn, setSortColumn] = useState(0);
  const [selectedItem, setSelectedItem]  = useState(null);

  
  const tableRender = (data) =>{
    let items = data.map((rule)=>{
      let createTime= new Date(rule.createdAt)
      return {
        id: rule.id,
        description: rule.description,
        action: rule.action,
        createdAtLocal: createTime.toLocaleString(),
        createdAt: rule.createdAt,
        nrql: rule.nrql,
        source: rule.source == "Logging" ? "Logs UI" : rule.source,
        creatorName: rule.creator.name,
        creatorEmail: rule.creator.email
      }
    })


    const _onClickTableHeaderCell = (column, evt, { nextSortingType }) => {
      if (column === sortColumn) {
        setSortingType(nextSortingType);
      } else {
        setSortColumn(column)
        setSortingType(nextSortingType)
      }
    }


    //create sort type map for number of columns
    const sortingColumnsState=[...Array(7).keys()].map((x)=>{
      return sortColumn === x
        ? sortingType
        : TableHeaderCell.SORTING_TYPE.NONE;
    })

    let columnIndex=0

    return <Table
    className="dropRulesContainer"
    multivalue
    selectionType={Table.SELECTION_TYPE.SINGLE}
    items={items}
    selected={({ index }) => index === selectedRow}
    onSelect={(evt, { index }) => {
      const populateInfo = (itemIndex) =>{
        if(itemIndex!=null) {
          setSelectedItem(items[itemIndex])
        } else {
          setSelectedItem(null)
        } 
      }

      setSelectedRow((prevState) => {
        if(prevState!=null) {
          if(prevState === index) {
            populateInfo(null)
            return null //de-select
          } else {
            populateInfo(index)
            return index
          }
        } else {
          populateInfo(index)
          return index
        }
      });
    }}
  >
    
    <TableHeader>
      <TableHeaderCell   
            width="3fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.id}>
        Description
      </TableHeaderCell>
      <TableHeaderCell 
            width="1fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.action}>
        Action
      </TableHeaderCell>
      <TableHeaderCell 
            width="1fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.source}>
        Source
      </TableHeaderCell>
      <TableHeaderCell 
            width="1fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.creatorName}>
        Creator
      </TableHeaderCell>
      <TableHeaderCell 
            width="1fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.createdAt}>
        Create time
      </TableHeaderCell>
      <TableHeaderCell 
            width="5fr"
            sortable
            sortingType={sortingColumnsState[columnIndex]}
            onClick={_onClickTableHeaderCell.bind(this, columnIndex++)}
            value={({ item }) => item.nrql}>
        NRQL
      </TableHeaderCell>
    </TableHeader>

    {({ item }) => (
      <TableRow>
        <TableRowCell additionalValue={`ID: ${item.id}`}>{item.description}</TableRowCell>
        <TableRowCell>{item.action}</TableRowCell>
        <TableRowCell>{item.source}</TableRowCell>
        <TableRowCell additionalValue={item.creatorEmail}>{item.creatorName}</TableRowCell>
        <TableRowCell>{item.createdAtLocal}</TableRowCell>
        <TableRowCell>{item.nrql}</TableRowCell>
      </TableRow>
    )}
  </Table>
  }
  
  const dropRulesTable = () => {
      if(selectedAccountId) {
        const query = `
              query($accountId: Int!) {
                  actor {
                      accountDetails: account(id: $accountId) {
                          name
                      }

                      dropRules: account(id: $accountId) {
                        nrqlDropRules {
                          list {
                            rules {
                              id
                              description
                              nrql
                              source
                              createdBy
                              creator {
                                email
                                name
                              }
                              createdAt
                              action
                            }
                          }
                        }
                      }
                  }
              }
          `;

      
        const variables = {
          accountId: selectedAccountId,
        };
        return <NerdGraphQuery query={query} variables={variables}>
        {({ loading, error, data }) => {
          if (loading) {
            return <div className="dropRulesContainer"><Spinner inline/> Looking for drop rules...</div>
          }

          if (error) {
            return 'Error!';
          }

          if(data.actor.dropRules.nrqlDropRules.list.rules.length > 0) {
            return <>
              <BlockText className="summaryLine">
                <strong>{data.actor.dropRules.nrqlDropRules.list.rules.length}</strong>{` drop rules found for account "${data.actor.accountDetails.name}"`}. Select a rule to view details.
              </BlockText>
               {tableRender(data.actor.dropRules.nrqlDropRules.list.rules)}
               
             </>
          } else {
            return <div className="dropRulesContainer">There are no drop rules for account: "{data.actor.accountDetails.name}" ({selectedAccountId}).</div>
          }
          
        }}
      </NerdGraphQuery>
      } else {
        return <div className="dropRulesContainer">Please select an account.</div>
    }
  }

  const detailPanel = () => {

    if(selectedItem && selectedAccountId) {

      const deleteRule=`mutation {
  nrqlDropRulesDelete(accountId: ${selectedAccountId}, ruleIds: "${selectedItem.id}") {
    successes {
      id
    }
    failures {
      error {
        description
        reason
      }
    }
  }
}`

      const createRule=`mutation {
  nrqlDropRulesCreate(accountId: ${selectedAccountId}, rules: {action:${selectedItem.action}, description: "${selectedItem.description}", nrql: "${selectedItem.nrql}"}) {
    successes {
      id
    }
    failures {
      error {
        description
        reason
      }
    }
  }
}`

      const terraformConfig=`resource "newrelic_nrql_drop_rule" "rule" {
  account_id  = ${selectedAccountId}
  description = "${selectedItem.description}"
  action      = "${selectedItem.action.toLowerCase()}"
  nrql        = "${selectedItem.nrql}"
}
`

      // const launcher = { id: 'data-exploration.query-builder' };
      // const location = navigation.getOpenLauncherLocation(launcher);
      return <TileGroup className="detailPaneContainer" tileWidth="3fr">

      <Tile>
        <HeadingText type={HeadingText.TYPE.HEADING_4}>
          {`Selected Rule (#${selectedItem.id})`}
        </HeadingText>

        <BlockText>
          {selectedItem.description}
        </BlockText>

        <br /><br />
        <HeadingText type={HeadingText.TYPE.HEADING_5}>
          Action
        </HeadingText>
        <BlockText>
          {selectedItem.action}
        </BlockText>

        <br /><br />
        <HeadingText type={HeadingText.TYPE.HEADING_5}>
          Created
        </HeadingText>
        <BlockText>
          {`${selectedItem.creatorName} (${selectedItem.creatorEmail})`}
          <br />
          {`${selectedItem.createdAtLocal} (via ${selectedItem.source})`}
        </BlockText>

        <br /><br />
        <HeadingText type={HeadingText.TYPE.HEADING_5}>
          NRQL
        </HeadingText>
        <pre className="codeBlock">
          {selectedItem.nrql}
        </pre>
        
        {/* <Link to={location}>View in Query Builder</Link> */}

      </Tile>

        <Tile>
        <HeadingText type={HeadingText.TYPE.HEADING_4}>
          GraphQL Delete Mutation
        </HeadingText>
          <pre className="codeBlock">
            {deleteRule}
          </pre>
        <Link to={`https://api.newrelic.com/graphiql?#query=${encodeURI(deleteRule)}`}>Open in Graphiql</Link>
      </Tile>

      <Tile>
        <HeadingText type={HeadingText.TYPE.HEADING_4}>
          GraphQL Create Mutation
        </HeadingText>
          <pre className="codeBlock">
            {createRule}
          </pre>
        <Link to={`https://api.newrelic.com/graphiql?#query=${encodeURI(createRule)}`}>Open in Graphiql</Link>
      </Tile>


      <Tile>
        <HeadingText type={HeadingText.TYPE.HEADING_4}>
          Terraform Configuration
        </HeadingText>
          <pre className="codeBlock">
            {terraformConfig}
          </pre>
      </Tile>

     </TileGroup>

    } else {
      return null
    }
    

  }

  return (
    <div className="outerContainer">
      <HeadingText type={HeadingText.TYPE.HEADING_2}>Drop Rule Explorer</HeadingText>
      <AccountsQuery>
        {({ loading, error, data }) => {
          if (loading) {
            return <Spinner />;
          }
          if (error) {
            return 'Error!';
          }

     
          if(!selectedAccountId && data.length == 1) {
            setSelectedAccountId(data[0].id)
          }

          const picker = data.length <= 1 ? null :  <AccountPicker
            className="accountPicker"
            label="Account:"
            labelInline
            value={ selectedAccountId}
            onChange={(_,value)=>{setSelectedItem(null); setSelectedAccountId(value); }}
          />
        
          return (<>
            {picker}
            {detailPanel()}
            {dropRulesTable()}
                  </>
                );
              }}
            </AccountsQuery>

    </div>
  );
}

export default DropRuleExplorer;