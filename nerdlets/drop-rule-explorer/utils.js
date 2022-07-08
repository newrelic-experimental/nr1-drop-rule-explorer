import { NerdGraphMutation, Toast } from 'nr1'

 
export function DeleteDropRule(accountId, ruleIds) {
    const query = `mutation {
        nrqlDropRulesDelete(accountId: ${accountId}, ruleIds: [${ruleIds}]) {
          successes {
            id
          }
          failures {
            error {
              description
            }
          }
        }
      }`
      // This returns a promise, so we can .then(refetch) on the click action when we call the delete.
      return NerdGraphMutation.mutate({mutation: query})
}

// successes array will contain the ID of the newly created rule if successful.
// failures array should be empty.
export function CreateDropRule(accountId, config, refetch, resetState) {
  if (config.description=="" || config.nrql=="" ) {
    Toast.showToast({
      title: 'Error',
      description: 'All fields must be filled in.',
      type: Toast.TYPE.CRITICAL,
    })
    return false
  }
    const query = `mutation {
        nrqlDropRulesCreate(accountId: ${accountId}, rules: {action: ${config.type}, description: "${config.description}", nrql: "${config.nrql}"}) {
          failures {
            error {
              description
            }
          }
          successes {
            id
          }
        }
      }`
      
      return NerdGraphMutation.mutate({mutation: query}).then((data)=>{
        if(data.data.nrqlDropRulesCreate.failures.length > 0) {
          Toast.showToast({
            title: 'Failed to create drop rule',
            description: `Error: ${data.data.nrqlDropRulesCreate.failures[0].error.description}`,
            type: Toast.TYPE.CRITICAL,
          })

        } else {
          Toast.showToast({
            title: 'Success',
            description: 'Drop rule created.',
            type: Toast.TYPE.NORMAL,
          })
          resetState()
          refetch()
        }
      }).catch((err)=>{
        Toast.showToast({
          title: 'Failed to create drop rule',
          description: `${err.message}`,
          type: Toast.TYPE.CRITICAL,
        })
      })
}
