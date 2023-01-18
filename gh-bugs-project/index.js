import process from 'process'
import { Octokit, App } from 'octokit'
import { graphql } from '@octokit/graphql'

const token = process.env.GITHUB_TOKEN
const project = process.env.PROJECT_ID
const status = process.env.STATUS_ID
const done = process.env.DONE_ID
const batch = process.env.BATCH || 50
const errors = []

const octokit = new Octokit({
  auth: token,
})
const gql = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
})

const ids = []

let res = await octokit.request('GET /orgs/{org}/issues', {
  org: 'supabase',
  filter: 'all',
  state: 'all',
  labels: 'bug',
  sort: 'updated',
  per_page: batch,
})

ids.push(
  ...res.data.map((r) => {
    return {
      id: r.node_id,
      state: r.state,
    }
  })
)

console.log(JSON.stringify(ids))
console.log(ids.length)

const addItemToProject = async (item) => {
  const { addProjectV2ItemById } = await gql({
    query: `mutation addProjectV2ItemById {
      addProjectV2ItemById(input: {
        projectId: \"${project}\"
        contentId: \"${item.id}\"
      }) {
        item {
          id
        }
      }
    }`,
  })
  if (item.state === 'closed') {
    await gql({
      query: `mutation updateProjectV2ItemFieldValue {
        updateProjectV2ItemFieldValue(input: {
        projectId: \"${project}\"
        itemId: \"${addProjectV2ItemById.item.id}\"
        fieldId: \"${status}\"
        value: {
          singleSelectOptionId: \"${done}\"
        }
      }) {
        projectV2Item {
          id
        }
      }
    }`,
    })
  }
}

let submitted = 0
const sendBatch = 1
for (let i = 0; i <= ids.length / sendBatch; i++) {
  const promises = []
  const max = Math.min(sendBatch, ids.length - i * sendBatch)
  for (let j = 0; j < max; j++) {
    promises.push(addItemToProject(ids[i * sendBatch + j]))
    submitted++
  }
  try {
    await Promise.all(promises)
  } catch (e) {
    console.log(e.request.query)
    console.log(JSON.stringify(e.response.errors))
    console.log('retrying')
    const res = await gql({
      query: e.request.query,
    })
    console.log(JSON.stringify(res.response.errors))
    errors.push(JSON.stringify(res.response.errors))
  }
  await new Promise((resolve) => setTimeout(resolve, 100))
}

console.log('success = ', submitted)
process.exit(errors.length)
