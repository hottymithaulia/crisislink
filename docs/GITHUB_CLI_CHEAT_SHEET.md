# 🚀 GitHub Command Line Cheat Sheet

## 📋 Essential GitHub Commands for Windows CMD/PowerShell

### 🔧 **Setup & Configuration**
```bash
# Configure Git (one-time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Check current configuration
git config --list

# Check Git version
git --version
```

### 🌐 **Repository Operations**
```bash
# Clone a repository
git clone https://github.com/username/repository-name.git

# Initialize new repository
git init

# Check repository status
git status

# View all commits
git log --oneline

# View detailed commit history
git log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
```

### 📁 **File Operations**
```bash
# Add specific file
git add filename.js

# Add all files
git add .

# Add all files including deleted ones
git add -A

# Remove file
git rm filename.js

# Move/rename file
git mv oldname.js newname.js

# Check what changed but not staged
git diff

# Check staged changes
git diff --staged
```

### 💾 **Commit Operations**
```bash
# Commit with message
git commit -m "Your commit message here"

# Commit with detailed message
git commit -m "Fix: Fixed the timeout issue in API calls

- Updated timeout from 10s to 15s
- Fixed CORS configuration
- Added error handling"

# Commit and add all files in one step
git commit -am "Quick commit message"

# Amend last commit (if you forgot something)
git commit --amend -m "Updated commit message"
```

### 🌍 **Remote Operations**
```bash
# View remote repositories
git remote -v

# Add remote repository
git remote add origin https://github.com/username/repository-name.git

# Remove remote
git remote remove origin

# Push to remote repository
git push origin main

# Push to specific branch
git push origin feature-branch

# Force push (use carefully!)
git push --force origin main

# Pull latest changes from remote
git pull origin main

# Pull without merging (fetch only)
git fetch origin
```

### 🌿 **Branch Operations**
```bash
# List all branches
git branch

# List all branches (including remote)
git branch -a

# Create new branch
git branch feature-branch

# Switch to branch
git checkout feature-branch

# Create and switch to branch in one step
git checkout -b feature-branch

# Merge branch into current branch
git merge feature-branch

# Delete branch (after merging)
git branch -d feature-branch

# Force delete branch (if not merged)
git branch -D feature-branch
```

### 🔍 **Inspection & Comparison**
```bash
# Show commit details
git show commit-hash

# Show file changes in commit
git show commit-hash:filename.js

# Compare branches
git diff main..feature-branch

# Compare specific files between branches
git diff main..feature-branch -- filename.js

# See who changed what and when
git blame filename.js

# Search commits by message
git log --grep="timeout"
```

### 🔄 **Undo Operations**
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Discard all local changes
git reset --hard HEAD

# Discard changes to specific file
git checkout -- filename.js

# Revert specific commit (creates new commit)
git revert commit-hash

# Remove untracked files
git clean -fd
```

### 🏷️ **Tagging**
```bash
# Create tag
git tag v1.0.0

# Create annotated tag
git tag -a v1.0.0 -m "Version 1.0.0 release"

# Push tags to remote
git push origin --tags

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0
```

### 📊 **Repository Status & Info**
```bash
# Show repository summary
git status --short

# Show file statistics
git count-objects -v

# Show repository size
git du

# Show recent activity
git log --since="2 weeks ago" --oneline

# Show commit by author
git log --author="Your Name" --oneline
```

---

## 🎯 **CrisisLink-Specific Workflow**

### **Daily Development Workflow**
```bash
# 1. Start day - Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-component

# 3. Work on your changes
git add .
git commit -m "Add: New SystemStatus component with real-time monitoring"

# 4. Push feature branch
git push origin feature/new-component

# 5. When done, merge to main
git checkout main
git pull origin main
git merge feature/new-component
git push origin main
```

### **Testing on Different Machines**
```bash
# 1. Clone fresh copy on new machine
git clone https://github.com/hottymithaulia/crisislink.git
cd crisislink

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Test the application
cd backend && npm start
# In new terminal: cd frontend && npm start

# 4. If you make changes on new machine
git add .
git commit -m "Fix: Resolved timeout issues on new environment"
git push origin main

# 5. Pull changes on original machine
git pull origin main
```

### **Quick Status Check**
```bash
# Check if you have uncommitted changes
git status --porcelain

# Check if you're behind remote
git fetch origin
git log HEAD..origin/main --oneline

# Quick push if needed
git push origin main
```

---

## 🛠️ **Advanced Git Tips**

### **Stashing Changes**
```bash
# Save current work temporarily
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Clear all stashes
git stash clear
```

### **Cherry-Picking Commits**
```bash
# Pick specific commit from another branch
git cherry-pick commit-hash

# Pick multiple commits
git cherry-pick commit1..commit3
```

### **Rebasing**
```bash
# Rebase current branch onto main
git rebase main

# Interactive rebase (to edit/squash commits)
git rebase -i HEAD~3
```

### **Git Aliases (Productivity Boosters)**
```bash
# Create useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit -m
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Now you can use:
git st        # instead of git status
git co main   # instead of git checkout main
git br        # instead of git branch
git cm "msg"  # instead of git commit -m "msg"
```

---

## 🚨 **Troubleshooting Common Issues**

### **Merge Conflicts**
```bash
# 1. See conflicted files
git status

# 2. Edit conflicted files manually
# Look for <<<<<<<, =======, >>>>>>> markers

# 3. After fixing conflicts
git add conflicted-file.js
git commit -m "Resolve merge conflicts"
```

### **Push Rejected (Non-Fast Forward)**
```bash
# Pull latest changes first
git pull origin main

# Then push your changes
git push origin main

# Or force push if you're sure
git push --force origin main
```

### **Detached HEAD State**
```bash
# Get back to main branch
git checkout main

# Or create new branch from detached state
git checkout -b new-branch-name
```

---

## 📱 **Quick Reference Card**

```bash
# Daily Commands
git pull origin main          # Get latest
git checkout -b feature      # New branch
git add . && git commit -m "msg"  # Save work
git push origin feature      # Share work
git checkout main && git merge feature  # Merge
git push origin main         # Update main

# Emergency Commands
git status                   # What's happening?
git log --oneline -5         # Recent commits
git reset --hard HEAD        # Discard all changes
git checkout -- file.js      # Discard file changes
git stash                    # Save work temporarily
```

---

## 🎯 **Master Git in 30 Days**

### **Week 1: Basics**
- Day 1-2: Setup, clone, add, commit, push
- Day 3-4: Branch, merge, pull
- Day 5-7: Status, log, diff

### **Week 2: Intermediate**
- Day 8-10: Remote operations, fetch vs pull
- Day 11-12: Stashing, rebasing
- Day 13-14: Conflict resolution

### **Week 3: Advanced**
- Day 15-17: Cherry-pick, revert, reset
- Day 18-19: Hooks, aliases
- Day 20-21: Submodules, worktrees

### **Week 4: Mastery**
- Day 22-24: Advanced workflows
- Day 25-26: Performance optimization
- Day 27-30: Custom scripts, automation

---

**💡 Pro Tip**: Create a batch file `git-quick.bat` for common commands:

```batch
@echo off
echo Git Quick Status
git status --short
git log --oneline -3
echo.
echo Remote Status:
git remote -v
```

Save this in your PATH and run `git-quick` anytime!

---

**🚀 With this cheat sheet, you can handle 95% of GitHub operations entirely from the command line!**
