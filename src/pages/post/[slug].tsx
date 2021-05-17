import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';

import { FaCalendar, FaUser, FaClock } from 'react-icons/fa';
import { format } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Prismic from '@prismicio/client';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import UtterancesComments from '../../components/UtterancesComments';

interface Post {
  uid: string;
  prevPost: {
    uid: string;
    title: string;
  };
  nextPost: {
    uid: string;
    title: string;
  };
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  preview: boolean;
  post: Post;
}

export default function Post({ preview, post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="banner" />
      </div>
      <div className={commonStyles.container}>
        <div className={styles.post}>
          <strong>{post.data.title}</strong>
        </div>
        <div className={styles.info}>
          <FaCalendar />
          <span>
            {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
              locale: pt,
            })}
          </span>
          <FaUser />
          <span>{post.data.author}</span>
          <FaClock />
          <span>4 min</span>
        </div>
        <div className={styles.lastEdit}>
          <span>* editado em </span>
          <span>
            {format(new Date(post.last_publication_date), 'dd MMM yyyy', {
              locale: pt,
            })}
            {`, às `}
            {format(new Date(post.last_publication_date), 'hh:mm', {
              locale: pt,
            })}
          </span>
        </div>
        <div className={styles.content}>
          {post.data.content.map(content => (
            <>
              <strong>{content.heading}</strong>
              {content.body.map(body => (
                <p>{body.text}</p>
              ))}
            </>
          ))}
        </div>
        <hr className={styles.divider} />
        <div className={styles.navigator}>
          <div className={styles.nav}>
            {post.prevPost.uid && (
              <>
                <Link href={`/post/${post.prevPost.uid}`}>
                  <a>
                    <span>{post.prevPost.title}</span>
                  </a>
                </Link>
                <p>Post Anterior</p>
              </>
            )}
          </div>
          <div className={styles.nav}>
            {post.nextPost.uid && (
              <>
                <Link href={`/post/${post.nextPost.uid}`}>
                  <a>
                    <span>{post.nextPost.title}</span>
                  </a>
                </Link>
                <p>Próximo Post</p>
              </>
            )}
          </div>
        </div>
        <div className={styles.comments}>
          <UtterancesComments />
        </div>
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

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 2,
    }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
  params,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const nextResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const prevResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const post = {
    uid: response.uid,
    prevPost: {
      uid: prevResponse?.results[0]?.uid || null,
      title: prevResponse?.results[0]?.data.title || null,
    },
    nextPost: {
      uid: nextResponse?.results[0]?.uid || null,
      title: nextResponse?.results[0]?.data.title || null,
    },
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      preview,
      post,
    },
    redirect: 60 * 30,
  };
};
