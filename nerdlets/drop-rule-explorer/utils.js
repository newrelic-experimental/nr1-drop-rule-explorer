import { NerdGraphMutation, Toast } from 'nr1'

 
export function DeleteDropRule(accountId, ruleIds, callback) {
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
      return NerdGraphMutation.mutate({mutation: query}).then((deleteData)=>{
        if(callback) {callback(deleteData)} else {
          if(deleteData?.data?.nrqlDropRulesDelete?.failures.length !== 0) {
            Toast.showToast({
              title: 'Delete rule failed',
              description: `Error: ${deleteData?.data?.nrqlDropRulesDelete?.failures[0]?.error?.description}`,
              type: Toast.TYPE.CRITICAL,
            })
          } else {
            Toast.showToast({
              title: 'Success',
              description: 'Drop rule deleted successfully.',
              type: Toast.TYPE.NORMAL,
            });
          }
        }
      }).catch((err)=>{
        Toast.showToast({
          title: 'Failed to delete drop rule.',
          description: `Error: ${err}`,
          type: Toast.TYPE.CRITICAL,
        })
      })
}


// successes array will contain the ID of the newly created rule if successful.
// failures array should be empty.
export async function CreateDropRule(accountId, replaceRuleId, config, refetch, resetStateCB) {
  if (config.description=="" || config.nrql=="" ) {
    Toast.showToast({
      title: 'Error',
      description: 'All fields must be filled in.',
      type: Toast.TYPE.CRITICAL,
    })
    return false
  }
    const query = `mutation {
        nrqlDropRulesCreate(accountId: ${accountId}, rules: {action: ${config.type}, source: "${config.source}" description: "${config.description}", nrql: "${config.nrql}"}) {
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
      
      return NerdGraphMutation.mutate({mutation: query}).then(async (data)=>{
        if(data.data.nrqlDropRulesCreate.failures.length > 0) {
          Toast.showToast({
            title: 'Failed to create drop rule',
            description: `Error: ${data?.data?.nrqlDropRulesCreate?.failures[0]?.error?.description}`,
            type: Toast.TYPE.CRITICAL,
          });

        } else {
          if(replaceRuleId===null) {
            Toast.showToast({
              title: 'Success',
              description: 'Drop rule created.',
              type: Toast.TYPE.NORMAL,
            });
            resetStateCB();
            refetch();
          } else {
            DeleteDropRule(accountId, replaceRuleId,((deleteData)=>{

              if(deleteData?.data?.nrqlDropRulesDelete?.failures.length !== 0) {
                Toast.showToast({
                  title: 'New rule created but failed to delete old drop rule.',
                  description: `Error: ${deleteData?.data?.nrqlDropRulesDelete?.failures[0]?.error?.description}`,
                  type: Toast.TYPE.CRITICAL,
                })
              } else {
                Toast.showToast({
                  title: 'Success',
                  description: 'Drop rule replaced successfully.',
                  type: Toast.TYPE.NORMAL,
                });
                resetStateCB();
                refetch();
              }
            }
            ));
          }
         
        }
      }).catch((err)=>{
        Toast.showToast({
          title: 'Failed to create drop rule.',
          description: `${err.message}`,
          type: Toast.TYPE.CRITICAL,
        })
      })
}
