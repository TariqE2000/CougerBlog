<?php
// ====================
// db_config.php - Database Configuration
// ====================


define('DB_HOST', '127.0.0.1');     // local MySQL
define('DB_USER', 'root');          // or whatever user you use locally
define('DB_PASS', '');              // root password if you set one
define('DB_NAME', 'cougerblog');    // the local DB you created

function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");
    return $conn;
}


function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function jsonResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}


// ====================
// auth.php - Authentication Functions
// ====================

// Note: session_start() is called in api.php

function registerUser($username, $email, $password, $firstName = '', $lastName = '') {
    $conn = getDBConnection();
    
    // Check if user already exists
    $stmt = $conn->prepare("SELECT user_id FROM Users WHERE email = ? OR username = ?");
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'User already exists'];
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert new user (default role: student, status: active)
    $stmt = $conn->prepare("
        INSERT INTO Users (username, email, password_hash, role, status)
        VALUES (?, ?, ?, 'student', 'active')
    ");
    $stmt->bind_param("sss", $username, $email, $hashedPassword);
    
    if ($stmt->execute()) {
        $newUserId = $stmt->insert_id;
        $stmt->close();
        $conn->close();
        
        return [
            'success' => true,
            'message' => 'Registration successful',
            'user' => [
                'user_id'  => $newUserId,
                'username' => $username,
                'email'    => $email,
                'role'     => 'student'
            ]
        ];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to register user'];
    }
}


function loginUser($username, $password) {
    $conn = getDBConnection();
    
    // Match your actual column names
    $stmt = $conn->prepare("
        SELECT user_id, username, email, password_hash, role
        FROM Users
        WHERE username = ? OR email = ?
        LIMIT 1
    ");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Invalid credentials'];
    }
    
    $user = $result->fetch_assoc();
    
    if (password_verify($password, $user['password_hash'])) {
        // Set session variables
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        
        $stmt->close();
        $conn->close();
        
        return [
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'user_id'  => $user['user_id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Invalid credentials'];
    }
}


function logoutUser() {
    session_unset();
    session_destroy();
    return ['success' => true, 'message' => 'Logged out successfully'];
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function isAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

function getHomePosts() {
    $conn = getDBConnection();

    $sql = "
        SELECT post_id, username, title, content, created_at
        FROM Posts
        ORDER BY created_at DESC
        LIMIT 50
    ";

    $result = $conn->query($sql);
    $posts = [];

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $posts[] = [
                'id'         => (int)$row['post_id'],   // match AdminPage.js style
                'username'   => $row['username'],
                'title'      => $row['title'],
                'content'    => $row['content'],
                'created_at' => $row['created_at'],
            ];
        }
        $result->free();
    }

    $conn->close();
    return $posts;
}


// ====================
// posts.php - Post Functions
// ====================

// ====================
// posts.php - Post Functions  (UPDATED FOR CURRENT SCHEMA)
// ====================
//
// Posts table: post_id, username, title, content, created_at
// Users table: user_id, username, email, password_hash, role, status, created_at
//

function createPost($title, $body, $authorId, $status = 'Approved') {
    $conn = getDBConnection();

    // Convert user_id -> username
    $stmt = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
    $stmt->bind_param("i", $authorId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userRow = $res->fetch_assoc();
    $stmt->close();

    $username = $userRow ? $userRow['username'] : 'Unknown';

    // Insert into Posts (no status column in DB)
    $stmt = $conn->prepare("
        INSERT INTO Posts (username, title, content, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    $stmt->bind_param("sss", $username, $title, $body);

    if ($stmt->execute()) {
        $postId = $stmt->insert_id;
        $stmt->close();
        $conn->close();
        return [
            'success'  => true,
            'message'  => 'Post created',
            'post_id'  => $postId,
            'username' => $username
        ];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to create post'];
    }
}

function getAllPosts($limit = 100, $offset = 0, $status = 'Approved') {
    $conn = getDBConnection();

    $stmt = $conn->prepare("
        SELECT post_id, username, title, content, created_at
        FROM Posts
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $posts = [];
    while ($row = $result->fetch_assoc()) {
        $posts[] = [
            'id'         => (int)$row['post_id'],
            'username'   => $row['username'],
            'title'      => $row['title'],
            'content'    => $row['content'],
            'created_at' => $row['created_at'],
            // logical status only; no column in DB
            'status'     => $status
        ];
    }

    $stmt->close();
    $conn->close();

    return ['success' => true, 'posts' => $posts];
}

function getPostById($postId) {
    $conn = getDBConnection();

    $stmt = $conn->prepare("
        SELECT post_id, username, title, content, created_at
        FROM Posts
        WHERE post_id = ?
    ");
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        $post = [
            'id'         => (int)$row['post_id'],
            'username'   => $row['username'],
            'title'      => $row['title'],
            'content'    => $row['content'],
            'created_at' => $row['created_at'],
            'status'     => 'Approved'
        ];

        $stmt->close();
        $conn->close();
        return ['success' => true, 'post' => $post];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Post not found'];
    }
}

function getPostsByAuthor($authorId) {
    $conn = getDBConnection();

    // Convert user_id -> username
    $stmt = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
    $stmt->bind_param("i", $authorId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userRow = $res->fetch_assoc();
    $stmt->close();

    if (!$userRow) {
        $conn->close();
        return ['success' => true, 'posts' => []];
    }

    $username = $userRow['username'];

    $stmt = $conn->prepare("
        SELECT post_id, username, title, content, created_at
        FROM Posts
        WHERE username = ?
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    $posts = [];
    while ($row = $result->fetch_assoc()) {
        $posts[] = [
            'id'         => (int)$row['post_id'],
            'username'   => $row['username'],
            'title'      => $row['title'],
            'content'    => $row['content'],
            'created_at' => $row['created_at'],
            'status'     => 'Approved'
        ];
    }

    $stmt->close();
    $conn->close();

    return ['success' => true, 'posts' => $posts];
}

function updatePost($postId, $title, $body, $authorId) {
    $conn = getDBConnection();

    // Get current user username
    $stmt = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
    $stmt->bind_param("i", $authorId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userRow = $res->fetch_assoc();
    $stmt->close();

    if (!$userRow) {
        $conn->close();
        return ['success' => false, 'message' => 'User not found'];
    }

    $username = $userRow['username'];

    // Check post ownership
    $stmt = $conn->prepare("SELECT username FROM Posts WHERE post_id = ?");
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Post not found'];
    }

    $postRow = $res->fetch_assoc();
    $stmt->close();

    if ($postRow['username'] !== $username && !isAdmin()) {
        $conn->close();
        return ['success' => false, 'message' => 'Unauthorized'];
    }

    // Update post
    $stmt = $conn->prepare("
        UPDATE Posts
        SET title = ?, content = ?
        WHERE post_id = ?
    ");
    $stmt->bind_param("ssi", $title, $body, $postId);

    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Post updated'];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to update post'];
    }
}

function deletePost($postId, $authorId) {
    $conn = getDBConnection();

    // Get current user username
    $stmt = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
    $stmt->bind_param("i", $authorId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userRow = $res->fetch_assoc();
    $stmt->close();

    if (!$userRow) {
        $conn->close();
        return ['success' => false, 'message' => 'User not found'];
    }

    $username = $userRow['username'];

    // Only delete if owned by this user or admin
    if (isAdmin()) {
        $stmt = $conn->prepare("DELETE FROM Posts WHERE post_id = ?");
        $stmt->bind_param("i", $postId);
    } else {
        $stmt = $conn->prepare("DELETE FROM Posts WHERE post_id = ? AND username = ?");
        $stmt->bind_param("is", $postId, $username);
    }

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Post deleted'];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to delete post'];
    }
}

function searchPosts($query) {
    $conn = getDBConnection();
    $like = '%' . $query . '%';

    $stmt = $conn->prepare("
        SELECT post_id, username, title, content, created_at
        FROM Posts
        WHERE title   LIKE ?
           OR content LIKE ?
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("ss", $like, $like);
    $stmt->execute();
    $result = $stmt->get_result();

    $posts = [];
    while ($row = $result->fetch_assoc()) {
        $posts[] = [
            'id'         => (int)$row['post_id'],
            'username'   => $row['username'],
            'title'      => $row['title'],
            'content'    => $row['content'],
            'created_at' => $row['created_at'],
            'status'     => 'Approved'
        ];
    }

    $stmt->close();
    $conn->close();

    return ['success' => true, 'posts' => $posts];
}


// ====================
// comments.php - Comment Functions
// ====================

function addComment($postId, $authorId, $content) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("INSERT INTO Comments (post_id, author_id, content, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $postId, $authorId, $content);
    
    if ($stmt->execute()) {
        $commentId = $conn->insert_id;
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Comment added', 'comment_id' => $commentId];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to add comment'];
    }
}

function getCommentsByPost($postId) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("
        SELECT c.*, u.username, u.first_name, u.last_name 
        FROM Comments c 
        LEFT JOIN Users u ON c.author_id = u.id 
        WHERE c.post_id = ? 
        ORDER BY c.created_at ASC
    ");
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comments = [];
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }
    
    $stmt->close();
    $conn->close();
    
    return ['success' => true, 'comments' => $comments];
}

function deleteComment($commentId, $userId) {
    $conn = getDBConnection();
    
    // Verify ownership or admin
    $stmt = $conn->prepare("SELECT author_id FROM Comments WHERE id = ?");
    $stmt->bind_param("i", $commentId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Comment not found'];
    }
    
    $comment = $result->fetch_assoc();
    if ($comment['author_id'] != $userId && !isAdmin()) {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Unauthorized'];
    }
    
    $stmt->close();
    
    $stmt = $conn->prepare("DELETE FROM Comments WHERE id = ?");
    $stmt->bind_param("i", $commentId);
    
    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Comment deleted'];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to delete comment'];
    }
}


// ====================
// announcements.php - Announcement Functions
// ====================

function createAnnouncement($title, $body) {
    if (!isAdmin()) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }
    
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("INSERT INTO Announcements (title, body, created_at) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $title, $body);
    
    if ($stmt->execute()) {
        $announcementId = $conn->insert_id;
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Announcement created', 'announcement_id' => $announcementId];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to create announcement'];
    }
}

function getAllAnnouncements() {
    $conn = getDBConnection();
    
    $result = $conn->query("SELECT * FROM Announcements ORDER BY created_at DESC");
    
    $announcements = [];
    while ($row = $result->fetch_assoc()) {
        $announcements[] = $row;
    }
    
    $conn->close();
    
    return ['success' => true, 'announcements' => $announcements];
}

function deleteAnnouncement($announcementId) {
    if (!isAdmin()) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }
    
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("DELETE FROM Announcements WHERE id = ?");
    $stmt->bind_param("i", $announcementId);
    
    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Announcement deleted'];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to delete announcement'];
    }
}


// ====================
// tags.php - Tag Functions
// ====================

function createTag($name) {
    $conn = getDBConnection();
    
    // Check if tag already exists
    $stmt = $conn->prepare("SELECT id FROM Tags WHERE name = ?");
    $stmt->bind_param("s", $name);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $tag = $result->fetch_assoc();
        $stmt->close();
        $conn->close();
        return ['success' => true, 'tag_id' => $tag['id'], 'message' => 'Tag already exists'];
    }
    
    $stmt->close();
    
    $stmt = $conn->prepare("INSERT INTO Tags (name) VALUES (?)");
    $stmt->bind_param("s", $name);
    
    if ($stmt->execute()) {
        $tagId = $conn->insert_id;
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Tag created', 'tag_id' => $tagId];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to create tag'];
    }
}

function addTagToPost($postId, $tagId) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("INSERT IGNORE INTO PostTags (post_id, tag_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $postId, $tagId);
    
    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        return ['success' => true, 'message' => 'Tag added to post'];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'Failed to add tag to post'];
    }
}

function getPostTags($postId) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("
        SELECT t.* 
        FROM Tags t 
        INNER JOIN PostTags pt ON t.id = pt.tag_id 
        WHERE pt.post_id = ?
    ");
    $stmt->bind_param("i", $postId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tags = [];
    while ($row = $result->fetch_assoc()) {
        $tags[] = $row;
    }
    
    $stmt->close();
    $conn->close();
    
    return ['success' => true, 'tags' => $tags];
}


// ====================
// users.php - User Functions
// ====================

function getAllUsers() {
    if (!isAdmin()) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }
    
    $conn = getDBConnection();
    
    $result = $conn->query("SELECT id, username, email, first_name, last_name, role, created_at FROM Users ORDER BY created_at DESC");
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    $conn->close();
    
    return ['success' => true, 'users' => $users];
}

function getUserById($userId) {
    $conn = getDBConnection();
    
    $stmt = $conn->prepare("SELECT id, username, email, first_name, last_name, role, created_at FROM Users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close();
        $conn->close();
        return ['success' => true, 'user' => $user];
    } else {
        $stmt->close();
        $conn->close();
        return ['success' => false, 'message' => 'User not found'];
    }
}

function updateUserProfile($userId, $username, $email, $firstName, $lastName) {
    $conn = getDBConnection();

    try {
        // Only allow the logged-in user or admin to update
        if (getCurrentUserId() != $userId && !isAdmin()) {
            $conn->close();
            return [
                'success' => false,
                'message' => 'Unauthorized'
            ];
        }

        if (empty($userId) || empty($username) || empty($email)) {
            $conn->close();
            return [
                'success' => false,
                'message' => 'Username and email are required'
            ];
        }

        // 1) Get the old username for this user_id
        $oldUsername = null;
        $stmtOld = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
        if (!$stmtOld) {
            error_log("updateUserProfile SELECT prepare error: " . $conn->error);
            $conn->close();
            return [
                'success' => false,
                'message' => 'Database error while updating profile'
            ];
        }
        $stmtOld->bind_param("i", $userId);
        $stmtOld->execute();
        $stmtOld->bind_result($oldUsername);
        $stmtOld->fetch();
        $stmtOld->close();

        if ($oldUsername === null) {
            $conn->close();
            return [
                'success' => false,
                'message' => 'User not found'
            ];
        }

        // 2) Update Users table (username + email)
        $stmt = $conn->prepare("
            UPDATE Users
            SET username = ?, email = ?
            WHERE user_id = ?
        ");
        if (!$stmt) {
            error_log("updateUserProfile UPDATE prepare error: " . $conn->error);
            $conn->close();
            return [
                'success' => false,
                'message' => 'Database error while updating profile'
            ];
        }

        $stmt->bind_param("ssi", $username, $email, $userId);

        if (!$stmt->execute()) {
            error_log("updateUserProfile UPDATE execute error: " . $stmt->error);
            $stmt->close();
            $conn->close();
            return [
                'success' => false,
                'message' => 'Failed to update profile'
            ];
        }
        $stmt->close();

        // 3) If username changed, also update Posts.username
        if ($oldUsername !== $username) {
            $stmtPosts = $conn->prepare("
                UPDATE Posts
                SET username = ?
                WHERE username = ?
            ");
            if ($stmtPosts) {
                $stmtPosts->bind_param("ss", $username, $oldUsername);
                if (!$stmtPosts->execute()) {
                    error_log("updateUserProfile Posts UPDATE error: " . $stmtPosts->error);
                }
                $stmtPosts->close();
            } else {
                error_log("updateUserProfile Posts UPDATE prepare error: " . $conn->error);
            }

            // If you have other tables that store username, update them here too
            // e.g. Comments, etc.
        }

        // 4) Keep PHP session username in sync
        if (isset($_SESSION['username'])) {
            $_SESSION['username'] = $username;
        }

        $conn->close();
        return [
            'success' => true,
            'message' => 'Profile updated successfully'
        ];
    } catch (Throwable $e) {
        error_log('updateUserProfile exception: ' . $e->getMessage());
        if ($conn) {
            $conn->close();
        }
        return [
            'success' => false,
            'message' => 'Database error while updating profile'
        ];
    }
}




function getUserStats($userId) {
    $conn = getDBConnection();

    // Convert user_id -> username
    $stmt = $conn->prepare("SELECT username FROM Users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $userRow = $res->fetch_assoc();
    $stmt->close();

    if (!$userRow) {
        $conn->close();
        return [
            'success' => true,
            'stats'   => [
                'total_posts' => 0,
                'total_views' => 0
            ]
        ];
    }

    $username = $userRow['username'];

    // Count posts for this user
    $stmt = $conn->prepare("
        SELECT COUNT(*) AS total_posts
        FROM Posts
        WHERE username = ?
    ");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $res = $stmt->get_result();
    $row = $res->fetch_assoc();
    $stmt->close();
    $conn->close();

    return [
        'success' => true,
        'stats'   => [
            'total_posts' => (int)$row['total_posts'],
            // No views column in Posts, so we just return 0
            'total_views' => 0
        ]
    ];
}





// ====================
// admin.php - Admin Functions
// ====================

// With no status column in Posts, this becomes a no-op that still returns success
function updatePostStatus($postId, $status) {
    if (!isAdmin()) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }

    // Nothing to update in DB, but we return success so admin UI keeps working
    return ['success' => true, 'message' => 'Status updated (no-op; no status column in Posts table)'];
}

function getDashboardStats() {
    if (!isAdmin()) {
        return ['success' => false, 'message' => 'Unauthorized'];
    }
    
    $conn = getDBConnection();
    
    $userCount = $conn->query("SELECT COUNT(*) as count FROM Users")->fetch_assoc()['count'];
    $postCount = $conn->query("SELECT COUNT(*) as count FROM Posts")->fetch_assoc()['count'];
    $announcementCount = $conn->query("SELECT COUNT(*) as count FROM Announcements")->fetch_assoc()['count'];
    
    $conn->close();
    
    return [
        'success' => true,
        'stats' => [
            'users' => $userCount,
            'posts' => $postCount,
            'announcements' => $announcementCount
        ]
    ];
}
?>