import React, { useState, FC } from 'react';
import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { 
  CalendarIcon, 
  LightningBoltIcon, 
  CheckCircledIcon, 
  CrossCircledIcon, 
  ArchiveIcon 
} from '@radix-ui/react-icons';
import { Study, StudyStatus } from '@/types/types';

// Предполагаем, что этот энум у вас уже определен
// enum StudyStatus {
//   PLANNED = 'PLANNED',
//   ONGOING = 'ONGOING',
//   COMPLETED = 'COMPLETED',
//   TERMINATED = 'TERMINATED',
//   ARCHIVED = 'ARCHIVED'
// }

interface StatusBadgeProps {
  status: StudyStatus;
  onChange?: (status: StudyStatus) => void;
  editable?: boolean;
}

const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  // Конфигурация с цветами Radix и иконками
  const statusConfig = {
    [StudyStatus.PLANNED]: { 
      label: 'Planned', 
      color: 'blue', 
      icon: CalendarIcon 
    },
    [StudyStatus.ONGOING]: { 
      label: 'Ongoing', 
      color: 'green', 
      icon: LightningBoltIcon 
    },
    [StudyStatus.COMPLETED]: { 
      label: 'Completed', 
      color: 'gray', 
      icon: CheckCircledIcon 
    },
    [StudyStatus.TERMINATED]: { 
      label: 'Terminated', 
      color: 'red', 
      icon: CrossCircledIcon 
    },
    [StudyStatus.ARCHIVED]: { 
      label: 'Archived', 
      color: 'purple', 
      icon: ArchiveIcon 
    }
  };

  const config = statusConfig[status];

  const handleStatusChange = (newStatus: StudyStatus) => {
    if (onChange) {
      onChange(newStatus);
      setIsEditing(false);
    }
  };

  // Режим редактирования
  if (isEditing) {
    return (
      <Flex gap="2" align="center" wrap="wrap">
        {Object.entries(statusConfig).map(([statusKey, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Button
              key={statusKey}
              variant="soft"
              color={cfg.color as any}
              size="1"
              onClick={() => handleStatusChange(statusKey as StudyStatus)}
              title={cfg.label}
              highContrast={status === statusKey}
            >
              <Icon width="16" height="16" />
            </Button>
          );
        })}
        <Button
          variant="ghost"
          color="gray"
          size="1"
          onClick={() => setIsEditing(false)}
          aria-label="Cancel editing"
        >
          <CrossCircledIcon width="16" height="16" />
        </Button>
      </Flex>
    );
  }

  // Режим просмотра
  const Icon = config.icon;
  
  return (
    <Badge
      color={config.color as any}
      variant="soft"
      size="1"
      onClick={editable ? () => setIsEditing(true) : undefined}
      style={{ 
        cursor: editable ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      title={editable ? 'Click to change status' : config.label}
    >
      <Flex gap="1" align="center">
        <Icon width="14" height="14" />
        <Text size="1" weight="medium">{config.label}</Text>
      </Flex>
    </Badge>
  );
};

export default StatusBadge;