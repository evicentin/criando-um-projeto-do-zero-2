import { useState, useEffect } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import pt from 'date-fns/locale/pt';

import { FaCalendar, FaUser } from 'react-icons/fa';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  preview: boolean;
  postsPagination: PostPagination;
}

export default function Home({
  preview,
  postsPagination,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState('');

  useEffect(() => {
    if (postsPagination) {
      setPosts(postsPagination.results);
      setNextPage(postsPagination.next_page);
    }
  }, [postsPagination]);

  const handleNextPage = (): void => {
    fetch(nextPage)
      .then(response => response.json())
      .then(body => {
        const { results } = body;

        const newPosts = results.map(res => {
          return {
            uid: res.uid,
            first_publication_date: res.first_publication_date,
            data: {
              title: res.data.title,
              subtitle: res.data.subtitle,
              author: res.data.author,
            },
          };
        });

        setPosts([...posts, ...newPosts]);
        setNextPage(body.next_page);
      });
  };

  return (
    <div className={commonStyles.container}>
      <div className={styles.posts}>
        {posts.map(result => (
          <div className={styles.result} key={result.uid}>
            <Link href={`/post/${result.uid}`}>
              <a>
                <strong>{result.data.title}</strong>
              </a>
            </Link>
            <p>{result.data.subtitle}</p>
            <div className={styles.info}>
              <FaCalendar />
              <span>
                {format(
                  new Date(result.first_publication_date),
                  'dd MMM yyyy',
                  {
                    locale: pt,
                  }
                )}
              </span>
              <FaUser />
              <span>{result.data.author}</span>
            </div>
          </div>
        ))}
        {nextPage && (
          <button type="button" onClick={handleNextPage}>
            Carregar mais posts
          </button>
        )}
        {preview && (
          <aside className={commonStyles.exitPreviewButton}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
      ref: previewData?.ref ?? null,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
        preview,
      },
    },
    revalidate: 60 * 60,
  };
};
