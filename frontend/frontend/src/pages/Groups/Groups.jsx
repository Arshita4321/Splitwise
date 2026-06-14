import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/common/Loader'
import Button from '../../components/common/Button'
import GroupList from '../../components/group/GroupList'
import CreateGroup from '../../components/group/CreateGroup'
import { getMyGroups } from '../../api/groups'
import { useToast } from '../../hooks/useToast'

export default function Groups() {
  const toast = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    try {
      setGroups(await getMyGroups())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Loader full />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Groups</h1>
          <p className="muted">All the groups you&apos;re part of.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New group</Button>
      </header>

      <GroupList groups={groups} />

      <CreateGroup
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(g) => navigate(`/groups/${g.id}`)}
      />
    </div>
  )
}
