interface BlogSummary {
  title: string;
  author: string;
  likes: number;
}

const dummy = (_blogs: BlogSummary[]): number => 1;

const totalLikes = (blogs: BlogSummary[]): number =>
  blogs.reduce((sum, blog) => sum + blog.likes, 0);

const favouriteBlog = (blogs: BlogSummary[]): BlogSummary | Record<string, never> => {
  if (blogs.length === 0) {
    return {};
  }

  const favourite = blogs.reduce((current, blog) =>
    blog.likes > current.likes ? blog : current,
  );
  return {
    title: favourite.title,
    author: favourite.author,
    likes: favourite.likes,
  };
};

export default { dummy, totalLikes, favouriteBlog };
