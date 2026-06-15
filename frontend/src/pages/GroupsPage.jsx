import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { getMyGroups } from '../api/groups.js';
import GroupCard from '../components/groups/GroupCard.jsx';
import CreateGroupModal from '../components/groups/CreateGroupModal.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function GroupsPage() {
  const { setTitle } = useOutletContext();
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setTitle('Groups'); }, [setTitle]);

  const load = async () => {
    try {
      const res = await getMyGroups();
      setGroups(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreated = (group) => {
    setGroups(prev => [{ ...group, role: 'admin', member_count: 1 }, ...prev]);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New group
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
          <Spinner size={28} />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="No groups yet"
          description="Create a group to start splitting expenses with friends, roommates, or travel buddies."
          action={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Create your first group</Button>}
        />
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px',
        }}>
          {groups.map(group => <GroupCard key={group.id} group={group} />)}
        </div>
      )}

      <CreateGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
