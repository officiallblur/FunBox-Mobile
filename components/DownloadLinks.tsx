import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxFonts, funboxTypography } from '@/constants/funbox-typography';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

type DownloadLinksProps = {
  editable?: boolean;
  movieId?: number | null;
};

export function DownloadLinks({ editable = false, movieId = null }: DownloadLinksProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const client = requireSupabase();
      let query = client.from('download_links').select('*').order('created_at', { ascending: false });
      if (movieId !== null && movieId !== undefined) {
        query = query.eq('movie_id', movieId);
      }
      const { data, error: queryError } = await query;
      if (queryError) {
        setError(true);
        setMessage('Failed to load download links');
        setLinks([]);
        return;
      }
      setError(false);
      setLinks(data ?? []);
    } catch (fetchError) {
      console.error(fetchError);
      setError(true);
      setMessage('Failed to load download links');
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleAdd = async () => {
    if (!title.trim() || !url.trim() || !isSupabaseConfigured) {
      return;
    }
    try {
      const client = requireSupabase();
      const payload: any = { title: title.trim(), url: url.trim() };
      if (movieId !== null && movieId !== undefined) {
        payload.movie_id = movieId;
      }
      const { error: insertError } = await client.from('download_links').insert([payload]);
      if (insertError) {
        setError(true);
        setMessage('Failed to add link');
        return;
      }
      setError(false);
      setMessage('Link added');
      setTitle('');
      setUrl('');
      fetchLinks();
    } catch (insertFail) {
      console.error(insertFail);
      setError(true);
      setMessage('Failed to add link');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete link', 'Delete this link?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!isSupabaseConfigured) {
            return;
          }
          try {
            const client = requireSupabase();
            const { error: deleteError } = await client.from('download_links').delete().eq('id', id);
            if (deleteError) {
              setError(true);
              setMessage('Failed to delete link');
              return;
            }
            setError(false);
            setMessage('Link deleted');
            fetchLinks();
          } catch (deleteFail) {
            console.error(deleteFail);
            setError(true);
            setMessage('Failed to delete link');
          }
        },
      },
    ]);
  };

  if (!isSupabaseConfigured) {
    return <Text style={styles.note}>Supabase is not configured. Download links are disabled.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Download Links</Text>
      {editable ? (
        <View style={styles.form}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={funboxColors.muted}
            style={styles.input}
          />
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="URL"
            placeholderTextColor={funboxColors.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      ) : null}

      {message ? (
        <View style={[styles.message, error ? styles.messageError : styles.messageOk]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.list}>
          {links.length === 0 ? <Text style={styles.note}>No download links available.</Text> : null}
          {links.map((link) => (
            <View key={link.id} style={styles.item}>
              <Pressable
                style={styles.itemLink}
                onPress={() => {
                  if (link.url) {
                    Linking.openURL(link.url);
                  }
                }}>
                <Text numberOfLines={1} style={styles.itemLinkText}>
                  {link.title || link.url}
                </Text>
              </Pressable>
              {editable ? (
                <Pressable onPress={() => handleDelete(link.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: 20,
  },
  heading: {
    color: funboxColors.accent,
    fontSize: 22,
    fontFamily: funboxFonts.bodyBold,
    marginBottom: 10,
  },
  form: {
    gap: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: funboxColors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: funboxColors.text,
    backgroundColor: '#071021',
    ...funboxTypography.searchInput,
  },
  addButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#fff',
    ...funboxTypography.button,
  },
  message: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  messageOk: {
    backgroundColor: funboxColors.success,
  },
  messageError: {
    backgroundColor: funboxColors.error,
  },
  messageText: {
    color: '#fff',
    ...funboxTypography.body,
  },
  list: {
    gap: 8,
  },
  item: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemLink: {
    flex: 1,
  },
  itemLinkText: {
    color: funboxColors.accent,
    ...funboxTypography.link,
  },
  deleteText: {
    color: '#ff7c7c',
    ...funboxTypography.button,
  },
  note: {
    color: funboxColors.muted,
    ...funboxTypography.body,
  },
});
