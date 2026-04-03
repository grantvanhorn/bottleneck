# Bottleneck Slack Bot MVP Technical Spec

## Overview
Bottleneck is a Slack bot that manages individual todo queues for users. It supports adding tasks, listing queues, marking tasks as complete, and viewing other users' queues via @mentions. All interactions are ephemeral, ensuring privacy and focused user experience.

## User Stories
### As a user, I want to add tasks to my queue so I can track my to-dos
- **Acceptance Criteria**: 
  - Task is stored with `id`, `user_id`, `text`, `position`, `created_at`, and `completed_at`
  - Position is set to the next available number in the user's queue
  - Response is ephemeral

### As a user, I want to view my queue so I can see my tasks in order
- **Acceptance Criteria**: 
  - List is ordered by `position` (1 = top of queue)
  - Includes all tasks for the user
  - Response is ephemeral

### As a user, I want to mark tasks as complete so they are removed from my queue
- **Acceptance Criteria**: 
  - Task is removed and `completed_at` is set
  - Remaining tasks are renumbered sequentially
  - Response is ephemeral

### As a user, I want to view another user's queue so I can check their to-dos
- **Acceptance Criteria**: 
  - Correct user's tasks are shown in order
  - Response is ephemeral

## Data Model
SQLite tables:
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

- `user_id`: Slack user ID (e.g., @user123)
- `position`: 1-based index for display order
- `completed_at`: NULL until task is marked done

## Slash Command Signatures
- `/todo add <task>`
  - Example: `/todo add Buy groceries`
- `/todo list`
- `/todo done <number>`
  - Example: `/todo done 3`
- `/todo list @user`
  - Example: `/todo list @user123`

## Error Cases
- Invalid task text in `/todo add` → Error: "Task cannot be empty"
- Invalid task number in `/todo done` → Error: "Invalid task number"
- Invalid `@user` mention → Error: "User not found"
- Attempting to mark a task done that already exists → Error: "Task not found"

## Edge Cases
- Empty queue: `/todo list` returns no tasks
- Multiple tasks done in sequence: Remaining tasks are renumbered correctly
- Adding tasks to non-empty queue: New task is appended with correct position

## Non-Functional Requirements
- **Response Time**: <2 seconds for all commands
- **Ephemeral Messages**: All responses visible only to the command user
- **Concurrency**: Support for concurrent task additions/removals without data corruption
- **Persistence**: Tasks are stored in SQLite with atomic writes
- **Scalability**: Efficient for up to 1000 tasks per user