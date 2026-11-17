await createPost(), createTodo()


async function createComment() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "John Doe", email: "john.doe@example.com", body: "This is a sample comment." })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating comment:", error);
    }
}

async function deletePost() {
    const postId = 1; // Replace with the ID of the post you want to delete
    try {
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`, {
            method: "DELETE"
        });
        if (response.ok) {
            console.log(`Post with ID ${postId} deleted successfully.`);
        } else {
            console.error(`Failed to delete post with ID ${postId}.`);
        }
    } catch (error) {
        console.error("Error deleting post:", error);
    }

}

async function createUser() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "John Doe", email: "john.doe@example.com" })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating user:", error);
    }
}

async function getAlbum() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/albums/1");
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error fetching albums:", error);
    }
}

async function createAlbum() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/albums", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Mixtape", userId: 1 })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating album:", error);
    }
}

async function getPhoto() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/photos/1");
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error fetching photo:", error);
    }
}

async function createPhoto() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Sunset", url: "https://example.com/sunset.jpg", thumbnailUrl: "https://via.placeholder.com/150", albumId: 1 })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating photo:", error);
    }
}

async function getPost() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error fetching post:", error);
    }
}

async function createPost() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "My Post", body: "This is the content of my post." })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating post:", error);
    }
}

async function getTodo() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/todos/2");
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error fetching todo:", error);
    }
}

async function createTodo() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/todos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Buy groceries", completed: false, userId: 1 })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating todo:", error);
    }
}

async function getComment() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/comments/1");
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error fetching comment:", error);
    }
}

async function createComment() {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "John Doe", email: "john.doe@example.com", body: "This is a comment." })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error("Error creating comment:", error);
    }
}

await createComment(), getComment(), deletePost(), createUser(), getAlbum(), createAlbum(), getPhoto(), createPhoto(), getPost(), createPost(), getTodo(), createTodo()