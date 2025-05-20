import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import SUPABASE_CONFIG from './config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Blog functionality
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Test Supabase connection
        const { data, error } = await supabase.from('Comments').select('count');
        if (error) throw error;
        console.log('Supabase connection successful');
        
        // Initialize blog features
        await initializeComments();
        initializeSearch();
        initializePagination();
        initializeSocialSharing();
    } catch (error) {
        console.error('Error initializing blog:', error);
    }
});

// Comments System
async function initializeComments() {
    const commentForms = document.querySelectorAll('.comment-form');
    
    // Load existing comments
    await loadComments();
    
    commentForms.forEach(form => {
        const textarea = form.querySelector('textarea');
        const nameInput = form.querySelector('input[name="name"]');
        const submitButton = form.querySelector('.submit-comment');
        
        if (submitButton) {
            submitButton.addEventListener('click', async (e) => {
                e.preventDefault(); // Prevent form submission
                
                const comment = textarea.value.trim();
                const name = nameInput ? nameInput.value.trim() : 'Anonymous';
                
                if (!comment) {
                    alert('Please enter a comment');
                    return;
                }

                try {
                    submitButton.disabled = true;
                    submitButton.textContent = 'Posting...';
                    
                    const { data, error } = await supabase
                        .from('Comments')
                        .insert([
                            { 
                                name: name,
                                comment: comment,
                                created_at: new Date().toISOString()
                            }
                        ])
                        .select();

                    if (error) throw error;

                    console.log('Comment submitted successfully:', data);
                    
                    // Clear form
                    textarea.value = '';
                    if (nameInput) nameInput.value = '';
                    
                    // Reload comments
                    await loadComments();
                    
                    alert('Comment posted successfully!');
                } catch (error) {
                    console.error('Error submitting comment:', error);
                    alert('Failed to submit comment: ' + error.message);
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Post Comment';
                }
            });
        }
    });
}

async function loadComments() {
    try {
        const { data: comments, error } = await supabase
            .from('Comments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('Loaded comments:', comments);

        const commentsContainers = document.querySelectorAll('.post-comments');
        commentsContainers.forEach(container => {
            const commentsList = container.querySelector('.comments-list') || 
                               createCommentsList(container);
            
            // Clear existing comments
            commentsList.innerHTML = '';
            
            if (comments.length === 0) {
                commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
                return;
            }
            
            // Add comments to the list
            comments.forEach(comment => {
                const commentElement = createCommentElement(comment);
                commentsList.appendChild(commentElement);
            });
        });
    } catch (error) {
        console.error('Error loading comments:', error);
        const commentsContainers = document.querySelectorAll('.comments-list');
        commentsContainers.forEach(container => {
            container.innerHTML = '<p class="error-message">Failed to load comments. Please try again later.</p>';
        });
    }
}

function createCommentElement(comment) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    
    const date = new Date(comment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    commentElement.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${escapeHTML(comment.name)}</span>
            <span class="comment-date">${date}</span>
        </div>
        <div class="comment-content">${escapeHTML(comment.comment)}</div>
    `;
    
    return commentElement;
}

function createCommentsList(container) {
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    container.insertBefore(commentsList, container.querySelector('.comment-form'));
    return commentsList;
}


// Search and Filtering
function initializeSearch() {
    const searchInput = document.querySelector('.blog-search input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    const filterButtons = document.querySelectorAll('.filter-tag');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => handleFilter(button.dataset.tag));
    });
}

function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const posts = document.querySelectorAll('.blog-card');
    
    posts.forEach(post => {
        const title = post.querySelector('.blog-card-title').textContent.toLowerCase();
        const excerpt = post.querySelector('.blog-card-excerpt').textContent.toLowerCase();
        const tags = Array.from(post.querySelectorAll('.blog-card-tag'))
                         .map(tag => tag.textContent.toLowerCase());
        
        const isVisible = title.includes(searchTerm) || 
                         excerpt.includes(searchTerm) ||
                         tags.some(tag => tag.includes(searchTerm));
        
        post.style.display = isVisible ? 'block' : 'none';
    });
}

function handleFilter(tag) {
    const posts = document.querySelectorAll('.blog-card');
    const filterButtons = document.querySelectorAll('.filter-tag');
    
    filterButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tag === tag);
    });
    
    posts.forEach(post => {
        const postTags = Array.from(post.querySelectorAll('.blog-card-tag'))
                            .map(tag => tag.textContent.toLowerCase());
        post.style.display = tag === 'all' || postTags.includes(tag.toLowerCase()) 
            ? 'block' : 'none';
    });
}

// Pagination
function initializePagination() {
    const postsPerPage = 6;
    const posts = document.querySelectorAll('.blog-card');
    const totalPages = Math.ceil(posts.length / postsPerPage);
    
    if (totalPages > 1) {
        createPaginationControls(totalPages);
        showPage(1);
    }
}

function createPaginationControls(totalPages) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => showPage(i));
        paginationContainer.appendChild(pageButton);
    }
}

function showPage(pageNumber) {
    const posts = document.querySelectorAll('.blog-card');
    const postsPerPage = 6;
    const start = (pageNumber - 1) * postsPerPage;
    const end = start + postsPerPage;
    
    posts.forEach((post, index) => {
        post.style.display = index >= start && index < end ? 'block' : 'none';
    });
    
    // Update active page button
    const pageButtons = document.querySelectorAll('.pagination button');
    pageButtons.forEach(button => {
        button.classList.toggle('active', button.textContent == pageNumber);
    });
}


// Social Sharing
function initializeSocialSharing() {
    const shareButtons = document.querySelectorAll('.share-button');
    shareButtons.forEach(button => {
        button.addEventListener('click', () => {
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            const platform = button.dataset.platform;
            
            let shareUrl;
            switch (platform) {
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
                    break;
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'linkedin':
                    shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
} 